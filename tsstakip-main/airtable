export async function GET() {
  return Response.json({
    success: true,
    message: "Airtable sync endpoint çalışıyor"
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("Airtable'dan gelen veri:", body);

    return Response.json({
      success: true,
      message: "Veri alındı",
      data: body
    });
  } catch (error) {
    console.error("Airtable sync hatası:", error);

    return Response.json(
      {
        success: false,
        message: "Sunucu hatası"
      },
      { status: 500 }
    );
  }
}
