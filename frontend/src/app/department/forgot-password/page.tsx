import { redirect } from "next/navigation";

export default function DepartmentForgotPasswordPage() {
  redirect("/department/auth");
}
