import { completeAuthentication } from "@/features/accounts/callback";
export async function GET(request: Request) {
  return completeAuthentication(request, "code");
}
