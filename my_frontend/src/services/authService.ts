import api from "./api";

interface LoginRequest {
  login: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
}

export async function login(
  credentials: LoginRequest
): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>(
    "/auth/login",
    credentials
  );

  return response.data;
}