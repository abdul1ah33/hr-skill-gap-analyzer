import api from "./api";

export async function extractResume(file: File) {
  const formData = new FormData();

  formData.append("file", file);

  const response = await api.post(
    "/resume/extract",
    formData
  );

  return response.data;
}