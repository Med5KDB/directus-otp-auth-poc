import type { Request, Response } from "express";
import jwt from "jsonwebtoken";

export async function getMe(
  req: Request,
  res: Response,
  { database, services, getSchema, env }: any
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        error: "Token d'authentification manquant",
      });
      return;
    }

    const token = authHeader.substring(7); // Remove "Bearer "

    const secret = env.SECRET || process.env.SECRET || "directus_secret_to_sign_access_tokens";

    let decoded: any;
    try {
      decoded = jwt.verify(token, secret);
    } catch (error) {
      res.status(401).json({
        success: false,
        error: "Token invalide ou expiré",
      });
      return;
    }

    const user = await database("directus_users")
      .where({ id: decoded.id })
      .first();

    if (!user) {
      res.status(404).json({
        success: false,
        error: "Utilisateur introuvable",
      });
      return;
    }

    // Return the user information (without the password)
    const { password, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error) {
    console.error("Erreur dans getMe:", error);
    res.status(500).json({
      success: false,
      error: "Erreur interne du serveur",
    });
  }
}

