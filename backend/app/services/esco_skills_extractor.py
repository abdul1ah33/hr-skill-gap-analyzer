import logging
from typing import Dict, List, Optional, Any

import requests


# ==========================================
# Logging Configuration
# ==========================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger("ESCOService")

# Silence noisy HTTP logs
logging.getLogger("urllib3").setLevel(logging.WARNING)


# ==========================================
# ESCO Service
# ==========================================
class EscoService:
    """
    Service responsible for communicating with the ESCO API.

    Responsibilities:
        1. Search for an occupation.
        2. Retrieve occupation details.
        3. Extract essential and optional skills.
        4. Cache results to avoid unnecessary repeated ESCO API calls.

    The returned skill format is intentionally compatible with
    the Phase 2B Gemini 'generate_perfect_profile()' function.
    """

    BASE_URL = "https://ec.europa.eu/esco/api"

    # Cache duration is not implemented here because ESCO data
    # changes relatively slowly. The cache lives for the lifetime
    # of this Python process.
    def __init__(self, timeout: int = 10):
        self.session = requests.Session()
        self.timeout = timeout

        # ------------------------------------------
        # In-memory caches
        # ------------------------------------------
        #
        # Example:
        # {
        #     "machine learning engineer": {
        #         "uri": "...",
        #         "title": "Machine Learning Engineer"
        #     }
        # }
        #
        self.occupation_cache: Dict[str, Dict[str, Any]] = {}

        #
        # Example:
        # {
        #     "http://data.europa.eu/esco/occupation/123": {
        #         "essential": ["Python", "Machine Learning"],
        #         "optional": ["Cloud Computing"]
        #     }
        # }
        #
        self.skills_cache: Dict[str, Dict[str, List[str]]] = {}

    # ==================================================
    # Search Occupation
    # ==================================================

    def search_occupation(
        self,
        occupation_name: str
    ) -> Optional[Dict[str, Any]]:
        """
        Search ESCO for an occupation.

        Args:
            occupation_name:
                Job/occupation title to search for.

        Returns:
            The best ESCO occupation result, or None if no result exists.
        """

        if not occupation_name or not occupation_name.strip():
            logger.warning("Empty occupation name received.")
            return None

        # Normalize cache key
        cache_key = occupation_name.strip().lower()

        # ------------------------------------------
        # Check cache first
        # ------------------------------------------
        if cache_key in self.occupation_cache:
            logger.info(
                f"ESCO occupation cache HIT for '{occupation_name}'"
            )
            return self.occupation_cache[cache_key]

        logger.info(
            f"ESCO occupation cache MISS for '{occupation_name}'. "
            f"Calling ESCO API..."
        )

        try:
            response = self.session.get(
                f"{self.BASE_URL}/search",
                params={
                    "text": occupation_name.strip(),
                    "type": "occupation",
                    "language": "en",
                    "limit": 1,
                    "selectedVersion": "latest",
                },
                timeout=self.timeout,
            )

            response.raise_for_status()

            data = response.json()

            results = data.get("_embedded", {}).get("results", [])

            if not results:
                logger.warning(
                    f"No ESCO occupation found for '{occupation_name}'."
                )
                return None

            occupation = results[0]

            # Store in cache
            self.occupation_cache[cache_key] = occupation

            logger.info(
                f"Found ESCO occupation: '{occupation.get('title')}'"
            )

            return occupation

        except requests.RequestException as exc:
            logger.error(
                f"ESCO API request failed while searching for "
                f"'{occupation_name}': {exc}"
            )
            return None

        except ValueError as exc:
            logger.error(
                f"Invalid JSON received from ESCO API: {exc}"
            )
            return None

        except Exception as exc:
            logger.exception(
                f"Unexpected error while searching ESCO: {exc}"
            )
            return None

    # ==================================================
    # Get Occupation Details
    # ==================================================

    def get_occupation(
        self,
        occupation_uri: str
    ) -> Optional[Dict[str, Any]]:
        """
        Retrieve detailed information about an ESCO occupation.

        Args:
            occupation_uri:
                ESCO occupation URI.

        Returns:
            ESCO occupation details, or None if the request fails.
        """

        if not occupation_uri:
            logger.warning("Empty occupation URI received.")
            return None

        try:
            response = self.session.get(
                f"{self.BASE_URL}/resource/occupation",
                params={
                    "uri": occupation_uri,
                    "language": "en",
                    "selectedVersion": "latest",
                },
                timeout=self.timeout,
            )

            response.raise_for_status()

            return response.json()

        except requests.RequestException as exc:
            logger.error(
                f"ESCO API request failed while retrieving occupation "
                f"'{occupation_uri}': {exc}"
            )
            return None

        except ValueError as exc:
            logger.error(
                f"Invalid JSON received from ESCO API: {exc}"
            )
            return None

        except Exception as exc:
            logger.exception(
                f"Unexpected error while retrieving ESCO occupation: {exc}"
            )
            return None

    # ==================================================
    # Extract Skills
    # ==================================================

    def get_skills(
        self,
        occupation_uri: str
    ) -> Optional[Dict[str, List[str]]]:
        """
        Extract essential and optional skill titles from an ESCO occupation.

        The output format is intentionally:

        {
            "essential": [
                "Python",
                "Machine Learning"
            ],
            "optional": [
                "Cloud Computing"
            ]
        }

        This matches the input expected by Phase 2B.
        """

        if not occupation_uri:
            logger.warning("Empty occupation URI received.")
            return None

        # ------------------------------------------
        # Check skills cache
        # ------------------------------------------
        if occupation_uri in self.skills_cache:
            logger.info(
                f"ESCO skills cache HIT for '{occupation_uri}'"
            )
            return self.skills_cache[occupation_uri]

        logger.info(
            f"ESCO skills cache MISS for '{occupation_uri}'. "
            f"Calling ESCO API..."
        )

        occupation = self.get_occupation(occupation_uri)

        if occupation is None:
            return None

        links = occupation.get("_links", {})

        skills = {
            "essential": [],
            "optional": [],
        }

        # ------------------------------------------
        # Essential Skills
        # ------------------------------------------
        for skill in links.get("hasEssentialSkill", []):
            title = skill.get("title")

            if title:
                skills["essential"].append(title)

        # ------------------------------------------
        # Optional Skills
        # ------------------------------------------
        for skill in links.get("hasOptionalSkill", []):
            title = skill.get("title")

            if title:
                skills["optional"].append(title)

        # ------------------------------------------
        # Remove duplicates while preserving order
        # ------------------------------------------
        skills["essential"] = list(
            dict.fromkeys(skills["essential"])
        )

        skills["optional"] = list(
            dict.fromkeys(skills["optional"])
        )

        # ------------------------------------------
        # Cache result
        # ------------------------------------------
        self.skills_cache[occupation_uri] = skills

        logger.info(
            f"Extracted {len(skills['essential'])} essential skills "
            f"and {len(skills['optional'])} optional skills."
        )

        return skills

    # ==================================================
    # Complete Pipeline
    # ==================================================

    def get_role_skills(
        self,
        occupation_name: str
    ) -> Optional[Dict[str, Any]]:
        """
        Complete ESCO pipeline.

        Input:
            "Machine Learning Engineer"

        Output:
            {
                "occupation": "Machine Learning Engineer",
                "uri": "...",
                "skills": {
                    "essential": [...],
                    "optional": [...]
                }
            }
        """

        logger.info(
            f"Getting ESCO skills for occupation: '{occupation_name}'"
        )

        # ------------------------------------------
        # Step 1: Find occupation
        # ------------------------------------------
        occupation = self.search_occupation(occupation_name)

        if occupation is None:
            return None

        occupation_uri = occupation.get("uri")
        occupation_title = occupation.get("title")

        if not occupation_uri:
            logger.error(
                "ESCO search result does not contain an occupation URI."
            )
            return None

        # ------------------------------------------
        # Step 2: Get skills
        # ------------------------------------------
        skills = self.get_skills(occupation_uri)

        if skills is None:
            return None

        # ------------------------------------------
        # Step 3: Return clean result
        # ------------------------------------------
        return {
            "occupation": occupation_title,
            "uri": occupation_uri,
            "skills": skills,
        }

    # ==================================================
    # Cache Management
    # ==================================================

    def clear_cache(self) -> None:
        """
        Clear all cached ESCO data.

        Useful during development/testing or if you want
        to force fresh API requests.
        """

        self.occupation_cache.clear()
        self.skills_cache.clear()

        logger.info("ESCO caches cleared.")

    def get_cache_stats(self) -> Dict[str, int]:
        """
        Return basic cache statistics.
        """

        return {
            "cached_occupations": len(self.occupation_cache),
            "cached_skill_sets": len(self.skills_cache),
        }


# ======================================================
# Example Usage
# ======================================================

if __name__ == "__main__":

    esco_service = EscoService()

    # ------------------------------------------
    # First request
    # ------------------------------------------

    result = esco_service.get_role_skills(
        "Machine Learning Engineer"
    )

    if result:

        print("\n" + "=" * 60)
        print("ESCO RESULT")
        print("=" * 60)

        print(f"\nOccupation: {result['occupation']}")
        print(f"URI: {result['uri']}")

        print("\nEssential Skills:")
        for skill in result["skills"]["essential"]:
            print(f"  - {skill}")

        print("\nOptional Skills:")
        for skill in result["skills"]["optional"]:
            print(f"  - {skill}")

    else:
        print("Failed to retrieve ESCO occupation.")

    # ------------------------------------------
    # Second request
    # ------------------------------------------
    #
    # This demonstrates the cache.
    #
    # ESCO should NOT be called again for the
    # occupation search.
    #

    print("\n" + "=" * 60)
    print("SECOND REQUEST")
    print("=" * 60)

    result2 = esco_service.get_role_skills(
        "Machine Learning Engineer"
    )

    # ------------------------------------------
    # Cache statistics
    # ------------------------------------------

    print("\nCache Statistics:")
    print(esco_service.get_cache_stats())
