import requests

class EscoService:

    BASE_URL = "https://ec.europa.eu/esco/api"

    def __init__(self):
        self.session = requests.Session()

    # ----------------------------------------------------
    # Search Occupation
    # ----------------------------------------------------

    def search_occupation(self, occupation_name):

        response = self.session.get(
            f"{self.BASE_URL}/search",
            params={
                "text": occupation_name,
                "type": "occupation",
                "language": "en",
                "limit": 1,
                "selectedVersion": "latest"
            }
        )

        response.raise_for_status()

        data = response.json()

        results = data.get("_embedded", {}).get("results", [])

        if not results:
            return None

        return results[0]

    # ----------------------------------------------------
    # Get Occupation Details
    # ----------------------------------------------------

    def get_occupation(self, occupation_uri):

        response = self.session.get(
            f"{self.BASE_URL}/resource/occupation",
            params={
                "uri": occupation_uri,
                "language": "en",
                "selectedVersion": "latest"
            }
        )

        response.raise_for_status()

        return response.json()

    # ----------------------------------------------------
    # Extract Skills
    # ----------------------------------------------------

    def get_skills(self, occupation_uri):

        occupation = self.get_occupation(occupation_uri)

        links = occupation.get("_links", {})

        skills = {
            "essential": [],
            "optional": []
        }

        # Essential Skills
        for skill in links.get("hasEssentialSkill", []):
            skills["essential"].append({
                "title": skill["title"],
                "uri": skill["uri"]
            })

        # Optional Skills
        for skill in links.get("hasOptionalSkill", []):
            skills["optional"].append({
                "title": skill["title"],
                "uri": skill["uri"]
            })

        return skills

    # ----------------------------------------------------
    # Complete Pipeline
    # ----------------------------------------------------

    def get_role_skills(self, occupation_name):

        occupation = self.search_occupation(occupation_name)

        if occupation is None:
            return None

        occupation_uri = occupation["uri"]

        return {
            "occupation": occupation["title"],
            "uri": occupation_uri,
            "skills": self.get_skills(occupation_uri)
        }