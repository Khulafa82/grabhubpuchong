import { Search } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const categories = ["All", "GrabCar", "GrabFood", "PSV", "Reactivation", "Tips"];
const articles = Array.from({ length: 6 }).map((_, i) => ({
  id: i + 1,
  title: `Helpful article title #${i + 1}`,
  excerpt: "A short preview of the article content prepared for the public.",
  category: categories[(i % (categories.length - 1)) + 1],
  date: "—",
}));

const Articles = () => (
  <>
    <PageHero eyebrow="Articles" title="Insights, tips & news" subtitle="Stay informed with the latest from Grab Hub Puchong." />
    <section className="container py-12">
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search articles..." className="pl-10" />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {categories.map((c, i) => (
            <Badge key={c} variant={i === 0 ? "default" : "outline"} className={i === 0 ? "bg-brand hover:bg-brand-dark cursor-pointer" : "cursor-pointer"}>
              {c}
            </Badge>
          ))}
        </div>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {articles.map((a) => (
          <Card key={a.id} className="overflow-hidden shadow-card-hover">
            <div className="h-40 gradient-brand opacity-90" />
            <div className="p-5">
              <Badge variant="outline" className="text-brand border-brand/30">{a.category}</Badge>
              <h3 className="font-semibold text-charcoal mt-3">{a.title}</h3>
              <p className="text-sm text-charcoal/60 mt-2">{a.excerpt}</p>
              <Button variant="link" className="px-0 mt-2 text-brand">Read more →</Button>
            </div>
          </Card>
        ))}
      </div>
      <div className="text-center mt-10">
        <Button variant="outline">Load more</Button>
      </div>
    </section>
  </>
);
export default Articles;
