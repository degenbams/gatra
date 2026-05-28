import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "@/components/register-form";

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="Daftar"
      title="Buat akun Gatra"
      description="Mulai dengan email dan password. Nama tampilan akan dipakai sebagai identitas ringan di profil Gatra."
    >
      <RegisterForm />
    </AuthShell>
  );
}
