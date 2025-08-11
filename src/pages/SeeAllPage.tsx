import { useParams } from "react-router-dom";

export default function SeeAllPage() {
  const { title } = useParams();

  return (
    <div style={{ padding: "20px" }}>
      <h1>All items for: {title}</h1>
      {/* Fetch and display the full list for this category */}
    </div>
  );
}
