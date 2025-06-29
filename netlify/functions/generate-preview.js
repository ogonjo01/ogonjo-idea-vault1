// netlify/functions/generate-preview.js

const fetch = require("node-fetch");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
// Pull in the NodeCanvasFactory helper from the legacy build
const { NodeCanvasFactory } = require("pdfjs-dist/legacy/build/pdf.node.js");
const jpeg = require("jpeg-js");

exports.handler = async function(event) {
  try {
    const { url } = JSON.parse(event.body || "{}");
    if (!url) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing URL" }) };
    }

    // Fetch the PDF bytes
    const resp = await fetch(url);
    if (!resp.ok) {
      return { statusCode: resp.status, body: JSON.stringify({ error: resp.statusText }) };
    }
    const arrayBuffer = await resp.arrayBuffer();

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    // Grab the first page
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1 });

    // Create a canvas & context using NodeCanvasFactory
    const canvasFactory = new NodeCanvasFactory();
    const { canvas, context: ctx } = canvasFactory.create(
      viewport.width,
      viewport.height
    );

    // Render into that canvas
    await page.render({
      canvasContext: ctx,
      viewport,
      canvasFactory,
    }).promise;

    // Extract the raw pixel data
    const imgData = ctx.getImageData(0, 0, viewport.width, viewport.height);

    // Encode to JPEG
    const jpegImage = jpeg.encode(
      {
        data: imgData.data,
        width: imgData.width,
        height: imgData.height,
      },
      85 // quality
    );

    // Return base64 string
    return {
      statusCode: 200,
      body: JSON.stringify({
        preview: jpegImage.data.toString("base64"),
      }),
    };

  } catch (err) {
    console.error("Preview function error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || err.toString() })
    };
  }
};
