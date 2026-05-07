export type ApiErrorBody = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

export type ApiSuccessBody<T> = {
  ok: true;
  data: T;
};

export function ok<T>(data: T, init?: ResponseInit) {
  return Response.json({ ok: true, data } satisfies ApiSuccessBody<T>, init);
}

export function fail(code: string, message: string, status = 400) {
  return Response.json({ ok: false, error: { code, message } } satisfies ApiErrorBody, { status });
}
