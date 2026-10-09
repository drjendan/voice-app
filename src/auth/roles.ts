export type PlatformRole =
  | "platform_owner"
  | "artist_owner"
  | "artist_manager"
  | "audio_engineer"
  | "model_engineer"
  | "viewer";

export type Experience = "platform_admin" | "artist_manager" | "engineer" | "artist";

export function experienceForRoles(roles: PlatformRole[]): Experience {
  if (roles.includes("platform_owner")) return "platform_admin";
  if (roles.includes("artist_manager")) return "artist_manager";
  if (roles.includes("audio_engineer") || roles.includes("model_engineer")) return "engineer";
  return "artist";
}

export function experienceLabel(experience: Experience): string {
  return {
    platform_admin: "Platform Admin",
    artist_manager: "Artist Manager",
    engineer: "Engineer",
    artist: "Artist Portal",
  }[experience];
}
