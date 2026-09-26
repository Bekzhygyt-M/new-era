import Navbar from '@/components/navbar/Navbar';
import Hero from '@/components/hero/Hero';
import Statistics from '@/components/statistics/Statistics';
import StrategyShowcase from '@/components/home/StrategyShowcase';
import WhatYouLearn from '@/components/home/WhatYouLearn';
import CourseCards from '@/components/course-cards/CourseCards';
import LearningJourney from '@/components/home/LearningJourney';
import StandardCurriculumPreview from '@/components/home/StandardCurriculumPreview';
import ProCurriculumPreview from '@/components/home/ProCurriculumPreview';
import CourseComparison from '@/components/home/CourseComparison';
import HowItWorks from '@/components/how-it-works/HowItWorks';
import Testimonials from '@/components/testimonials/Testimonials';
import FAQ from '@/components/faq/FAQ';
import FinalCTA from '@/components/home/FinalCTA';
import Footer from '@/components/footer/Footer';
import { db } from '@/lib/db';

export default async function Home() {
  const settings = await db.getSettings();

  return (
    <main className="min-h-screen bg-[#060606] text-white overflow-x-hidden">
      <Navbar />
      <Hero />
      <Statistics />
      <StrategyShowcase />
      <WhatYouLearn />
      <CourseCards />
      <LearningJourney />
      <StandardCurriculumPreview />
      <ProCurriculumPreview />
      <CourseComparison />
      <HowItWorks passingScore={settings.passing_score} watchRequirement={settings.watch_requirement} />
      <Testimonials />
      <FAQ />
      <FinalCTA />
      <Footer
        telegramUrl={settings.telegram_channel_url || settings.support_telegram}
        instagramUrl={settings.instagram_url}
        youtubeUrl={settings.youtube_url}
      />
    </main>
  );
}
