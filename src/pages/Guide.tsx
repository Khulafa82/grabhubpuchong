import { Award, FileText, ShieldCheck, ClipboardList, UserCheck } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const guides = [
  { icon: Award, title: "PSV Guide", desc: "Everything about obtaining your PSV license — courses, costs and timelines." },
  { icon: FileText, title: "Required Documents", desc: "Full checklist for GrabCar and GrabFood applicants." },
  { icon: ShieldCheck, title: "Approval Tips", desc: "Common mistakes to avoid for higher approval chances." },
  { icon: ClipboardList, title: "Registration Process", desc: "Detailed walkthrough of every registration step." },
  { icon: UserCheck, title: "Eligibility Information", desc: "Who qualifies and what conditions apply." },
];

const Guide = () => (
  <>
    <PageHero eyebrow="Guide" title="Read before you register" subtitle="Learn everything you need to know to apply with confidence." />
    <section className="container py-16 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
      {guides.map((g) => (
        <Card key={g.title} className="p-6 shadow-card-hover">
          <g.icon className="w-6 h-6 text-brand" />
          <h3 className="font-semibold text-charcoal mt-4">{g.title}</h3>
          <p className="text-sm text-charcoal/60 mt-2">{g.desc}</p>
          <Button asChild variant="link" className="px-0 mt-3 text-brand"><Link to="/register">Get started →</Link></Button>
        </Card>
      ))}
    </section>
  </>
);
export default Guide;
