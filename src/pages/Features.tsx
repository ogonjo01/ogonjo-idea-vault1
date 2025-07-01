//import Header from '@/components/Header';
//import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, Search, Tag, LayoutDashboard, Download, Star } from 'lucide-react';

const Features = () => {
  const features = [
    {
      icon: <Download className="h-8 w-8 text-primary" />,
      title: "Daily Uploads",
      description: "Fresh business ideas in PowerPoint format are added every day. Our growing library ensures you always have new strategies and concepts to explore and implement."
    },
    {
      icon: <Eye className="h-8 w-8 text-primary" />,
      title: "Presentation Viewer",
      description: "View presentations directly on the platform with our embedded viewer. Navigate slides seamlessly and preview content without downloading, keeping your workflow smooth and efficient."
    },
    {
      icon: <Tag className="h-8 w-8 text-primary" />,
      title: "Categories & Tags",
      description: "Easily browse ideas by category or tag. Organize content by industry, topic, or theme so you can quickly find the relevant presentations and insights you need."
    },
    {
      icon: <Search className="h-8 w-8 text-primary" />,
      title: "Search & Filtering",
      description: "Powerful search and filtering tools help you locate exactly what you're looking for. Search by keyword, filter by date or popularity, and sort results to pinpoint the perfect idea."
    },
    {
      icon: <LayoutDashboard className="h-8 w-8 text-primary" />,
      title: "User Dashboard",
      description: "Keep track of your activity in your personal dashboard. Save favorite presentations, track your downloads, and see recently viewed content all in one convenient place."
    },
    {
      icon: <Star className="h-8 w-8 text-primary" />,
      title: "Subscription Benefits",
      description: "As a subscriber, you get full access to all features. Download any presentation, receive exclusive members-only content, and enjoy an ad-free experience. Our tiered plans include priority support, premium templates, and early access to new features."
    }
    
  ];
  <div className="my-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center text-gray-500 dark:text-gray-400">
  <p className="font-roboto text-sm">Advertisement</p> {/* You can keep this label or remove it */}
  <ins className="adsbygoogle"
       style={{ display: 'block', textAlign: 'center', minHeight: '100px' }} // Use React style object
       data-ad-client="ca-pub-7769353221684341"
       data-ad-slot="7980803429"
       data-ad-format="auto"
       data-full-width-responsive="true"></ins>
  <script>
       (window.adsbygoogle = window.adsbygoogle || []).push({});
  </script>
</div>

  return (
    <div className="min-h-screen flex flex-col bg-background">
      
      
      <main className="flex-1 container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="font-montserrat font-bold text-4xl lg:text-5xl text-foreground mb-6">
            Platform Features
          </h1>
          <div className="my-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center text-gray-500 dark:text-gray-400">
  <p className="font-roboto text-sm">Advertisement</p> {/* You can keep this label or remove it */}
  <ins className="adsbygoogle"
       style={{ display: 'block', textAlign: 'center', minHeight: '100px' }} // Use React style object
       data-ad-client="ca-pub-7769353221684341"
       data-ad-slot="7980803429"
       data-ad-format="auto"
       data-full-width-responsive="true"></ins>
  <script>
       (window.adsbygoogle = window.adsbygoogle || []).push({});
  </script>
</div>
          <p className="font-roboto text-xl text-muted-foreground max-w-3xl mx-auto">
            Discover powerful tools and features designed to help you find, explore, and implement 
            fresh business ideas every day.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="h-full hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-montserrat font-semibold text-xl text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="font-roboto text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      
    </div>
  );
};

export default Features;