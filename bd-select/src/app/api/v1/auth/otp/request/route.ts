import { ok } from "@/lib/errors/api-response";
import { parseJsonBody } from "@/lib/validation/request";
import { OtpService } from "@/modules/identity/otp-service";
import { requestOtpSchema } from "@/modules/identity/schemas";
import { marketplaceFailure } from "@/modules/marketplace/response";

const otpService = new OtpService();

export async function POST(request: Request) {
  const body = await parseJsonBody(request, requestOtpSchema);
  if (!body.ok) return body.response;

  try {
    return ok(await otpService.requestOtp(body.data), { status: 201 });
  } catch (error) {
    return marketplaceFailure(error);
  }
}
