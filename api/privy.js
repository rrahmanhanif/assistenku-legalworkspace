export async function sendToPrivy(pdf, spl) {
  const response = await fetch("https://api.privy.id/sign", {
    method: "POST",
    headers: {
      Authorization: "Bearer PRIVY_PROD_KEY"
    },
    body: JSON.stringify({
      document: pdf,
      signers: [
        spl.client_email,
        spl.mitra_email
      ]
    })
  });

  return response.json();
}
