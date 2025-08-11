import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from '@/services/supabase';

export default function ListPage() {
  const { sectionTitle } = useParams();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!sectionTitle) return;

    // Example: change table/query based on the section
    const fetchData = async () => {
      let { data, error } = await supabase
        .from("book_summaries")
        .select("*")
        .eq("category", sectionTitle); // Filter by category

      if (error) {
        console.error(error);
      } else {
        setItems(data || []);
      }
    };

    fetchData();
  }, [sectionTitle]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">All in: {sectionTitle}</h1>
      {items.length === 0 ? (
        <p>No items found for this section.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-3 sm:grid-cols-2 grid-cols-1">
          {items.map((item) => (
            <li key={item.id} className="p-4 border rounded-lg shadow hover:shadow-lg transition">
              <h2 className="font-semibold">{item.title}</h2>
              <p className="text-gray-600">{item.description}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
