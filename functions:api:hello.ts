export const onRequestGet: PagesFunction = async (ctx) => {
  return new Response(JSON.stringify({ ok: true, msg: "Hello from Cloudflare Pages Functions!" }), {
    headers: { "content-type": "application/json" },
  });
};