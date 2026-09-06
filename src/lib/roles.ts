// Papel com poderes de admin: 'admin' ou 'dono' (dono da plataforma, S3.1b).
// Espelha a função is_admin() do banco, que aceita role IN ('admin','dono').
export function isAdminRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "dono";
}
