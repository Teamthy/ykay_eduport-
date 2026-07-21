"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, ArrowRight, Code, Shield, FileText, BarChart3, Presentation, Cpu, Globe, Quote } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// 8 Courses for 4x2 grid
const coursesData = [
    {
        id: "python",
        title: "Python Programming",
        certification: "IT Specialist – Python",
        category: "Programming",
        icon: <Code className="w-8 h-8" />,
        image: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800&auto=format&fit=crop&q=60",
        shortDesc: "Master Python programming from basics to advanced",
        href: "/it-education/python"
    },
    {
        id: "ai",
        title: "Artificial Intelligence",
        certification: "IT Specialist – AI",
        category: "Programming",
        icon: <Cpu className="w-8 h-8" />,
        image: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&auto=format&fit=crop&q=60",
        shortDesc: "AI fundamentals and practical applications",
        href: "/it-education/ai"
    },
    {
        id: "cybersecurity",
        title: "Cybersecurity",
        certification: "IT Specialist – Cybersecurity",
        category: "Security",
        icon: <Shield className="w-8 h-8" />,
        image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=60",
        shortDesc: "Protect systems and data from threats",
        href: "/it-education/cybersecurity"
    },
    {
        id: "word",
        title: "Microsoft Word",
        certification: "Microsoft Office Specialist",
        category: "Office",
        icon: <FileText className="w-8 h-8" />,
        image: "https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&auto=format&fit=crop&q=60",
        shortDesc: "Professional document creation",
        href: "/it-education/microsoft-word"
    },
    {
        id: "excel",
        title: "Microsoft Excel",
        certification: "Microsoft Office Specialist",
        category: "Office",
        icon: <BarChart3 className="w-8 h-8" />,
        image: "https://images.unsplash.com/photo-1543286386-713bdd548da4?w=800&auto=format&fit=crop&q=60",
        shortDesc: "Data analysis and spreadsheets",
        href: "/it-education/microsoft-excel"
    },
    {
        id: "powerpoint",
        title: "Microsoft PowerPoint",
        certification: "Microsoft Office Specialist",
        category: "Office",
        icon: <Presentation className="w-8 h-8" />,
        image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=60",
        shortDesc: "Create compelling presentations",
        href: "/it-education/microsoft-powerpoint"
    },
    {
        id: "excel-expert",
        title: "Excel Expert",
        certification: "Microsoft Office Specialist",
        category: "Office",
        icon: <BarChart3 className="w-8 h-8" />,
        image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60",
        shortDesc: "Advanced Excel and analytics",
        href: "/it-education/excel-expert"
    },
    {
        id: "digital-literacy",
        title: "Digital Literacy",
        certification: "IC3 Certification",
        category: "Fundamentals",
        icon: <Globe className="w-8 h-8" />,
        image: "https://images.unsplash.com/photo-1515378960530-7c0da6231fb1?w=800&auto=format&fit=crop&q=60",
        shortDesc: "Essential computing skills",
        href: "/it-education/digital-literacy"
    },
];

// Certificate Showcase Data
const certificates = [
    {
        name: "Akinbode Oluwajoba Emmanuel",
        certification: "Certified Information Technology Specialist - Python",
        image: "/akinbode-certificate.png"
    },
    {
        name: "Kuton Dagbeyon Olamide",
        certification: "Certified Information Technology Specialist - Python",
        image: "/kuton-certificate.png"
    },
];

// Testimonials Data — using real names & real headshots
const testimonials = [
    {
        name: "Akinbode Oluwajoba Emmanuel",
        role: "Python Certified",
        quote: "The Python certification programme at Ykay IT Hub transformed my coding skills. The hands-on training and expert guidance prepared me for real-world challenges.",
        image: "/akinbode-headshot.png"
    },
    {
        name: "Kuton Dagbeyon Olamide",
        role: "Python Certified",
        quote: "I gained confidence and technical expertise through Ykay's IT training. The certification has opened new opportunities for me in the tech industry.",
        image: "/kuton-headshot.png"
    },
];

const whyChoose = [
    "Internationally recognised certifications",
    "Experienced trainers with industry expertise",
    "Hands-on practical learning approach",
    "Modern ICT facilities and equipment",
    "Comprehensive certification exam preparation",
    "Suitable for students, graduates, and professionals",
];

export default function ITEducationPage() {
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phone: "",
        programme: "",
        trainingMode: "Online",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alert("Thank you for your interest! We will contact you soon.");
        setFormData({
            fullName: "",
            email: "",
            phone: "",
            programme: "",
            trainingMode: "Online",
        });
    };

    const programmes = coursesData.map(c => c.title);

    return (
        <>
            <Header />
            <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">

                {/* Hero Section */}
                <section className="pt-24 pb-16 bg-brand-navy px-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 bg-gradient-to-l from-brand-green to-transparent" />
                    <div className="mx-auto max-w-7xl relative z-10">
                        <div className="text-center">
                            <span className="inline-block px-3 py-1 rounded-full bg-brand-green/20 border border-brand-green/40 text-brand-green text-[10px] font-bold tracking-[0.3em] uppercase mb-6">
                                DIGITAL EXCELLENCE
                            </span>
                            <h1 className="font-display text-5xl md:text-7xl text-white leading-[0.95] mb-6">
                                YKAY COLLEGE <span className="text-brand-green">IT HUB</span>
                            </h1>
                            <p className="text-white/80 text-xl md:text-2xl font-body max-w-3xl mx-auto mb-8">
                                Empowering the Next Generation of Digital Professionals
                            </p>
                            <p className="text-white/60 text-lg font-body max-w-2xl mx-auto mb-12">
                                Develop industry-relevant digital skills through practical training and globally recognised certifications.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Courses & Certifications - 4x2 Grid */}
                <section id="programmes" className="py-20 px-6">
                    <div className="mx-auto max-w-7xl">
                        <div className="text-center mb-16">
                            <span className="inline-block px-3 py-1 rounded-full bg-brand-green/10 text-brand-green text-[10px] font-bold tracking-[0.3em] uppercase mb-4">
                                OUR PROGRAMMES
                            </span>
                            <h2 className="font-display text-4xl md:text-5xl text-[var(--text-primary)] mb-4">
                                Courses & <span className="text-brand-green">Certifications</span>
                            </h2>
                            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
                                Gain globally recognized certifications that open doors to opportunities worldwide.
                            </p>
                        </div>

                        {/* 4 Columns x 2 Rows Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {coursesData.map((course) => (
                                <div
                                    key={course.id}
                                    className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] shadow-[var(--card-shadow)] overflow-hidden transition-all hover:shadow-[var(--card-shadow-hover)] hover:translate-y-[-4px] group"
                                >
                                    {/* Card Image */}
                                    <div className="relative h-48 overflow-hidden bg-gradient-to-br from-brand-green/10 to-brand-navy/5">
                                        <Image
                                            src={course.image}
                                            alt={course.title}
                                            fill
                                            className="object-cover opacity-30 group-hover:opacity-100 transition-opacity duration-300"
                                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center z-10">
                                            <div className="w-16 h-16 rounded-2xl bg-brand-green/20 backdrop-blur-sm flex items-center justify-center text-brand-green group-hover:bg-brand-green/30 transition-all">
                                                {course.icon}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Content */}
                                    <div className="p-6">
                                        <div className="mb-3">
                                            <span className="inline-block px-2 py-1 rounded-full bg-brand-green/10 text-brand-green text-[10px] font-bold tracking-wider uppercase mb-2">
                                                {course.category}
                                            </span>
                                            <h3 className="font-display text-lg text-[var(--text-primary)] mb-1">{course.title}</h3>
                                            <p className="text-xs text-brand-green font-bold uppercase tracking-wider">{course.certification}</p>
                                        </div>

                                        <p className="text-[var(--text-secondary)] text-sm mb-6 line-clamp-2">
                                            {course.shortDesc}
                                        </p>

                                        <Link
                                            href={course.href}
                                            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-green text-white font-bold text-sm hover:bg-brand-green-dark transition-all"
                                        >
                                            Learn More <ArrowRight size={16} />
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Certificate Showcase */}
                <section className="py-20 px-6 bg-brand-navy">
                    <div className="mx-auto max-w-7xl">
                        <div className="text-center mb-16">
                            <span className="inline-block px-3 py-1 rounded-full bg-brand-orange/20 text-brand-orange text-[10px] font-bold tracking-[0.3em] uppercase mb-4">
                                SUCCESS STORIES
                            </span>
                            <h2 className="font-display text-4xl md:text-5xl text-white mb-4">
                                Certified <span className="text-brand-green">Graduates</span>
                            </h2>
                            <p className="text-white/70 max-w-2xl mx-auto">
                                Our students achieve globally recognized certifications
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            {certificates.map((cert, index) => (
                                <div
                                    key={index}
                                    className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-brand-green group"
                                >
                                    <Image
                                        src={cert.image}
                                        alt={`Certificate - ${cert.name}`}
                                        width={1200}
                                        height={1000}
                                        className="w-full h-auto transition-transform duration-500 group-hover:scale-105"
                                        priority={index === 0}
                                    />
                                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                                        <h3 className="font-display text-2xl text-white mb-2">{cert.name}</h3>
                                        <p className="text-brand-green font-bold text-sm uppercase tracking-wider">
                                            {cert.certification}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Testimonials */}
                <section className="py-20 px-6">
                    <div className="mx-auto max-w-7xl">
                        <div className="text-center mb-16">
                            <span className="inline-block px-3 py-1 rounded-full bg-brand-green/10 text-brand-green text-[10px] font-bold tracking-[0.3em] uppercase mb-4">
                                STUDENT VOICES
                            </span>
                            <h2 className="font-display text-4xl md:text-5xl text-[var(--text-primary)] mb-4">
                                What Our <span className="text-brand-green">Students Say</span>
                            </h2>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            {testimonials.map((testimonial, index) => (
                                <div
                                    key={index}
                                    className="bg-[var(--card-bg)] rounded-2xl p-8 border border-[var(--card-border)] shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] transition-all"
                                >
                                    <div className="flex items-start gap-6">
                                        <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 relative ring-2 ring-brand-green/30">
                                            <Image
                                                src={testimonial.image}
                                                alt={`Portrait of ${testimonial.name}`}
                                                fill
                                                className="object-cover"
                                                sizes="80px"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Quote className="w-6 h-6 text-brand-green" />
                                            </div>
                                            <p className="text-[var(--text-secondary)] text-lg font-body mb-6 italic">
                                                &ldquo;{testimonial.quote}&rdquo;
                                            </p>
                                            <div>
                                                <p className="font-bold text-[var(--text-primary)] font-display text-lg">
                                                    {testimonial.name}
                                                </p>
                                                <p className="text-sm text-brand-green font-bold uppercase tracking-wider mt-1">
                                                    {testimonial.role}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Why Choose Ykay IT Hub */}
                <section id="why-choose" className="py-20 px-6 bg-[var(--section-bg-alt)]">
                    <div className="mx-auto max-w-7xl">
                        <div className="text-center mb-16">
                            <span className="inline-block px-3 py-1 rounded-full bg-brand-orange/10 text-brand-orange text-[10px] font-bold tracking-[0.3em] uppercase mb-4">
                                WHY US
                            </span>
                            <h2 className="font-display text-4xl md:text-5xl text-[var(--text-primary)] mb-4">
                                Why Choose <span className="text-brand-green">Ykay IT Hub?</span>
                            </h2>
                        </div>

                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            <div>
                                <div className="relative">
                                    <div className="absolute -top-8 -left-8 w-24 h-24 bg-brand-green/10 rounded-2xl rotate-12" />
                                    <div className="relative rounded-2xl overflow-hidden shadow-xl h-80 bg-gradient-to-br from-brand-green/10 to-brand-navy/5">
                                        <Image
                                            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=60"
                                            alt="IT Training Classroom"
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 768px) 100vw, 50vw"
                                        />
                                    </div>
                                    <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-brand-orange/10 rounded-2xl -rotate-12" />
                                </div>
                            </div>

                            <div className="space-y-6">
                                {whyChoose.map((reason, index) => (
                                    <div key={index} className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-brand-green/10 flex items-center justify-center flex-shrink-0 mt-1">
                                            <Check className="w-5 h-5 text-brand-green" />
                                        </div>
                                        <p className="text-[var(--text-secondary)] font-body text-lg">{reason}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Call to Action - Registration Form */}
                <section id="register" className="py-20 px-6 bg-brand-navy">
                    <div className="mx-auto max-w-4xl">
                        <div className="text-center mb-12">
                            <span className="inline-block px-3 py-1 rounded-full bg-brand-green/20 text-brand-green text-[10px] font-bold tracking-[0.3em] uppercase mb-4">
                                GET STARTED
                            </span>
                            <h2 className="font-display text-4xl md:text-5xl text-white mb-4">
                                Ready to Transform Your <span className="text-brand-green">Digital Future?</span>
                            </h2>
                            <p className="text-white/70 text-lg">
                                Join thousands of students who have gained industry-recognized certifications
                            </p>
                        </div>

                        <div className="bg-[var(--card-bg)] rounded-[2rem] p-8 border border-white/10 shadow-2xl">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2">Full Name *</label>
                                        <input
                                            type="text"
                                            name="fullName"
                                            value={formData.fullName}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green/50"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2">Email *</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green/50"
                                            placeholder="john@example.com"
                                        />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2">Phone Number *</label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green/50"
                                            placeholder="+234 801 234 5678"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2">Programme of Interest *</label>
                                        <select
                                            name="programme"
                                            value={formData.programme}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green/50"
                                        >
                                            <option value="" className="text-[var(--text-muted)]">Select a programme</option>
                                            {programmes.map((prog, index) => (
                                                <option key={index} value={prog}>{prog}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">Preferred Training Mode</label>
                                    <select
                                        name="trainingMode"
                                        value={formData.trainingMode}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green/50"
                                    >
                                        <option value="Online">Online</option>
                                        <option value="In-Person">In-Person (Sango Ota)</option>
                                        <option value="Hybrid">Hybrid</option>
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-brand-green text-white font-bold uppercase tracking-widest text-sm hover:bg-brand-green-dark transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
                                >
                                    Register Now <ArrowRight size={16} />
                                </button>
                            </form>
                        </div>
                    </div>
                </section>

            </main>
            <Footer />
        </>
    );
}