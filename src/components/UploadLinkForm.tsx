// This code outlines how to build a three-link upload system in your platform frontend/backend.

// FRONTEND: React form to add/upload links
import { useState } from "react";

const UploadLinkForm = () => {
  const [youtubeLink, setYoutubeLink] = useState("");
  const [bookIdeaLink, setBookIdeaLink] = useState("");
  const [affiliateLink, setAffiliateLink] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    if (!youtubeLink || !bookIdeaLink || !affiliateLink) {
      setMessage("All links must be provided.");
      return;
    }

    try {
      const response = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeLink, bookIdeaLink, affiliateLink }),
      });

      const result = await response.json();
      if (response.ok) {
        setMessage("Links uploaded successfully!");
        setYoutubeLink("");
        setBookIdeaLink("");
        setAffiliateLink("");
      } else {
        setMessage(result.message || "Upload failed.");
      }
    } catch (error) {
      setMessage("Error uploading links.");
    }
  };

  return (
    <div className="space-y-4">
      <input
        placeholder="YouTube link (how-to video)"
        value={youtubeLink}
        onChange={(e) => setYoutubeLink(e.target.value)}
      />
      <input
        placeholder="Book link (idea-to-scale guide)"
        value={bookIdeaLink}
        onChange={(e) => setBookIdeaLink(e.target.value)}
      />
      <input
        placeholder="Affiliate link (book recommendations)"
        value={affiliateLink}
        onChange={(e) => setAffiliateLink(e.target.value)}
      />
      <button onClick={handleSubmit}>Upload</button>
      {message && <p>{message}</p>}
    </div>
  );
};

export default UploadLinkForm;

// BACKEND: Example API route handler (Node.js/Express or Next.js API route)
app.post("/api/links", async (req, res) => {
  const { youtubeLink, bookIdeaLink, affiliateLink } = req.body;

  if (!youtubeLink || !bookIdeaLink || !affiliateLink) {
    return res.status(400).json({ message: "All links are required" });
  }

  try {
    await db.links.insert({
      youtubeLink,
      bookIdeaLink,
      affiliateLink,
      createdAt: new Date(),
    });

    return res.status(200).json({ message: "Links uploaded successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error: failed to upload links" });
  }
});
