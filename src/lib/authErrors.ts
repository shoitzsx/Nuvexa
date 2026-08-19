import { siteUnavailableMessage } from "./userMessages";

export function getAuthErrorMessage(message: string): string {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("email rate limit") ||
    normalizedMessage.includes("rate limit exceeded") ||
    normalizedMessage.includes("too many requests")
  ) {
    return "Não foi possível concluir agora. Tente novamente em alguns minutos.";
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return "Seu cadastro ainda precisa ser confirmado. Verifique seu email para continuar.";
  }

  if (normalizedMessage.includes("invalid login credentials")) {
    return "Email ou senha inválidos.";
  }

  if (normalizedMessage.includes("user already registered")) {
    return "Não foi possível criar essa conta. Tente entrar ou use outro email.";
  }

  if (
    normalizedMessage.includes("failed to fetch") ||
    normalizedMessage.includes("network") ||
    normalizedMessage.includes("fetch")
  ) {
    return siteUnavailableMessage;
  }

  return "Não foi possível concluir agora. Tente novamente.";
}
