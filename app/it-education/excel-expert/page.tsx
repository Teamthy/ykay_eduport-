"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Award, BookOpen, Clock, Users, Check, GraduationCap, BarChart3, Quote } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ExcelExpertCoursePage() {
    const courseData = {
        title: "Microsoft Excel Expert",
        shortTitle: "Excel Expert",
        certification: "Microsoft Office Specialist – Excel Expert",
        category: "Office",
        duration: "6 Weeks",
        difficulty: "Advanced",
        price: "₦120,000",
        discountPrice: "₦100,000",
        heroImage: "/excel-expert-hero.jpg",
        heroTagline: "Advanced Excel for Complex Data Analysis",
        heroDescription: "Take your Excel skills to the expert level with advanced functions, complex data modeling, Power Query, Power Pivot, and VBA programming.",
        overview: "This advanced Excel course is designed for professionals who already have a solid foundation in Excel and want to master expert-level features. You'll learn to handle complex data analysis tasks, automate workflows with VBA, and use advanced tools like Power Query and Power Pivot. The Microsoft Office Specialist – Excel Expert certification demonstrates your ability to tackle the most challenging spreadsheet tasks.",
        learningObjectives: [
            "Master advanced Excel functions and formulas",
            "Work with Power Query for data transformation",
            "Use Power Pivot for complex data modeling",
            "Create advanced PivotTables and PivotCharts",
            "Automate tasks with VBA programming",
            "Implement advanced data validation",
            "Work with external data connections",
            "Create custom functions with VBA"
        ],
        curriculum: [
            {
                week: "Week 1-2: Advanced Functions",
                topics: [
                    "Advanced lookup functions (XLOOKUP, INDEX, MATCH)",
                    "Logical functions (IFS, SWITCH)",
                    "Text functions (TEXTJOIN, CONCAT, UNICHAR)",
                    "Array formulas and dynamic arrays",
                    "Error handling in formulas"
                ]
            },
            {
                week: "Week 3: Power Query",
                topics: [
                    "Introduction to Power Query",
                    "Importing data from various sources",
                    "Transforming and cleaning data",
                    "Merging and appending queries",
                    "Creating custom functions in Power Query"
                ]
            },
            {
                week: "Week 4: Power Pivot & Data Modeling",
                topics: [
                    "Introduction to Power Pivot",
                    "Creating data relationships",
                    "Building DAX formulas",
                    "Creating calculated columns and measures",
                    "Working with hierarchies"
                ]
            },
            {
                week: "Week 5: VBA Programming",
                topics: [
                    "Introduction to VBA and the VBA editor",
                    "Recording and editing macros",
                    "VBA programming fundamentals",
                    "Creating custom functions (UDFs)",
                    "Error handling in VBA"
                ]
            },
            {
                week: "Week 6: Advanced Features & Projects",
                topics: [
                    "Advanced PivotTable techniques",
                    "What-If Analysis tools",
                    "Creating custom add-ins",
                    "Working with external databases",
                    "Certification exam preparation"
                ]
            }
        ],
        certificationDetails: {
            name: "Microsoft Office Specialist – Excel Expert",
            provider: "Microsoft",
            examCode: "MO-201",
            validity: "Lifetime",
            recognition: "Globally recognized as the standard for advanced Excel skills",
            examFormat: "40-60 questions, 50 minutes",
            passingScore: "700/1000"
        },
        targetAudience: [
            "Excel users wanting to advance to expert level",
            "Data analysts and financial analysts",
            "Business intelligence professionals",
            "Accountants and finance professionals",
            "Anyone preparing for advanced Excel certifications",
            "Professionals working with large datasets"
        ],
        prerequisites: [
            "Solid understanding of basic Excel functions",
            "Experience with PivotTables and basic formulas",
            "Familiarity with Excel interface and features",
            "Completion of basic Excel course recommended"
        ],
        careerOutcomes: [
            "Senior Data Analyst", "Financial Analyst", "Business Intelligence Analyst", "Excel Consultant", "Financial Modeler", "Data Scientist"
        ],
        testimonial: {
            quote: "The Excel Expert course at Ykay IT Hub took my data analysis skills to a whole new level. I can now handle complex datasets and automate tasks that used to take hours.",
            name: "Student G",
            originalName: "Tolani Adebayo",
            role: "Senior Data Analyst"
        },
        relatedCourses: [
            { title: "Microsoft Excel", href: "/it-education/microsoft-excel" },
            { title: "Python Programming", href: "/it-education/python" },
            { title: "Digital Literacy", href: "/it-education/digital-literacy" }
        ]
    };

    return (
        <>
            <Header />
            <main className="bg-[var(--bg-primary)] min-h-screen theme-transition">

                {/* ===== HERO SECTION ===== */}
                <section className="pt-24 pb-16 bg-gradient-to-br from-brand-navy to-brand-navy/80 px-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 bg-gradient-to-l from-brand-green to-transparent" />
                    <div className="mx-auto max-w-7xl relative z-10">
                        <Link href="/it-education" className="inline-flex items-center gap-2 text-white/70 hover:text-brand-green transition-colors mb-8 group">
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                            <span>Back to IT Education</span>
                        </Link>

                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            <div>
                                <span className="inline-block px-3 py-1 rounded-full bg-brand-green/20 border border-brand-green/40 text-brand-green text-[10px] font-bold tracking-[0.3em] uppercase mb-6">
                                    {courseData.category}
                                </span>
                                <h1 className="font-display text-4xl md:text-6xl text-white leading-[0.95] mb-6">
                                    {courseData.title}
                                </h1>
                                <p className="text-white/80 text-xl font-body mb-8">
                                    {courseData.heroTagline}
                                </p>
                                <p className="text-white/60 text-lg font-body mb-8">
                                    {courseData.heroDescription}
                                </p>

                                <div className="flex flex-wrap gap-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-brand-green/20 flex items-center justify-center">
                                            <Award className="w-5 h-5 text-brand-green" />
                                        </div>
                                        <div>
                                            <p className="text-white/40 text-xs uppercase tracking-wider">Certification</p>
                                            <p className="text-white font-bold text-sm">{courseData.certification}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-brand-green/20 flex items-center justify-center">
                                            <Clock className="w-5 h-5 text-brand-green" />
                                        </div>
                                        <div>
                                            <p className="text-white/40 text-xs uppercase tracking-wider">Duration</p>
                                            <p className="text-white font-bold text-sm">{courseData.duration}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-brand-green/20 flex items-center justify-center">
                                            <Users className="w-5 h-5 text-brand-green" />
                                        </div>
                                        <div>
                                            <p className="text-white/40 text-xs uppercase tracking-wider">Level</p>
                                            <p className="text-white font-bold text-sm">{courseData.difficulty}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 bg-brand-green/10 rounded-3xl transform -rotate-3" />
                                <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10">
                                    <img src={courseData.heroImage || "/placeholder.jpg"} alt={courseData.title} className="w-full h-96 object-cover" />
                                    <div className="absolute top-6 right-6 w-16 h-16 rounded-2xl bg-brand-green/20 backdrop-blur-sm flex items-center justify-center text-brand-green">
                                        <BarChart3 className="w-8 h-8" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ===== COURSE OVERVIEW ===== */}
                <section className="py-20 px-6">
                    <div className="mx-auto max-w-7xl">
                        <div className="grid lg:grid-cols-3 gap-12">
                            <div className="lg:col-span-2">
                                <h2 className="font-display text-3xl md:text-4xl text-[var(--text-primary)] mb-6">Course Overview</h2>
                                <p className="text-[var(--text-secondary)] text-lg leading-relaxed font-body">{courseData.overview}</p>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-brand-navy rounded-2xl p-6 text-white">
                                    <h3 className="font-display text-xl mb-4">Course Fee</h3>
                                    {courseData.discountPrice && <p className="text-3xl font-bold text-white/60 line-through">{courseData.price}</p>}
                                    <p className="text-4xl font-bold text-brand-green">{courseData.discountPrice}</p>
                                    <p className="text-white/70 text-sm mb-6">Includes exam voucher, study materials, and certification</p>
                                    <Link href="#register" className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-green text-white font-bold hover:bg-brand-green-dark transition-all">
                                        Register Now <ArrowRight size={16} />
                                    </Link>
                                </div>

                                <div className="bg-[var(--card-bg)] rounded-2xl p-6 border border-[var(--card-border)]">
                                    <h3 className="font-display text-xl text-[var(--text-primary)] mb-4">Quick Info</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <BookOpen className="w-5 h-5 text-brand-green" />
                                            <span className="text-[var(--text-secondary)]">Online & In-Person</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Clock className="w-5 h-5 text-brand-green" />
                                            <span className="text-[var(--text-secondary)]">{courseData.duration}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <GraduationCap className="w-5 h-5 text-brand-green" />
                                            <span className="text-[var(--text-secondary)]">{courseData.difficulty}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ===== WHAT YOU'LL LEARN ===== */}
                <section className="py-20 px-6 bg-[var(--section-bg-alt)]">
                    <div className="mx-auto max-w-7xl">
                        <div className="text-center mb-16">
                            <span className="inline-block px-3 py-1 rounded-full bg-brand-green/10 text-brand-green text-[10px] font-bold tracking-[0.3em] uppercase mb-4">LEARNING OUTCOMES</span>
                            <h2 className="font-display text-3xl md:text-4xl text-[var(--text-primary)] mb-4">What You'll <span className="text-brand-green">Learn</span></h2>
                        </div>
                        <div className="grid md:grid-cols-2 gap-8">
                            {courseData.learningObjectives.map((objective, index) => (
                                <div key={index} className="bg-[var(--card-bg)] rounded-2xl p-6 border border-[var(--card-border)] shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] transition-all">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-brand-green/10 flex items-center justify-center flex-shrink-0 mt-1">
                                            <Check className="w-5 h-5 text-brand-green" />
                                        </div>
                                        <p className="text-[var(--text-secondary)] font-body">{objective}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ===== COURSE CURRICULUM ===== */}
                <section className="py-20 px-6">
                    <div className="mx-auto max-w-7xl">
                        <div className="text-center mb-16">
                            <span className="inline-block px-3 py-1 rounded-full bg-brand-orange/10 text-brand-orange text-[10px] font-bold tracking-[0.3em] uppercase mb-4">SYLLABUS</span>
                            <h2 className="font-display text-3xl md:text-4xl text-[var(--text-primary)] mb-4">Course <span className="text-brand-green">Curriculum</span></h2>
                        </div>
                        <div className="space-y-8">
                            {courseData.curriculum.map((week, index) => (
                                <div key={index} className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] shadow-[var(--card-shadow)] overflow-hidden">
                                    <div className="bg-brand-navy p-6">
                                        <h3 className="font-display text-xl text-white">{week.week}</h3>
                                    </div>
                                    <div className="p-6">
                                        <ul className="space-y-3">
                                            {week.topics.map((topic, topicIndex) => (
                                                <li key={topicIndex} className="flex items-start gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-brand-green mt-2 flex-shrink-0" />
                                                    <span className="text-[var(--text-secondary)] font-body">{topic}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ===== CERTIFICATION DETAILS ===== */}
                <section className="py-20 px-6 bg-brand-navy">
                    <div className="mx-auto max-w-7xl">
                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            <div>
                                <span className="inline-block px-3 py-1 rounded-full bg-brand-orange/20 text-brand-orange text-[10px] font-bold tracking-[0.3em] uppercase mb-4">CERTIFICATION</span>
                                <h2 className="font-display text-3xl md:text-4xl text-white mb-6">Get <span className="text-brand-green">Certified</span></h2>
                                <p className="text-white/70 text-lg font-body mb-8">Earn the Microsoft Office Specialist – Excel Expert certification, the gold standard for advanced Excel skills.</p>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                                        <h3 className="font-bold text-white mb-4">Certification Info</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between border-b border-white/10 pb-3">
                                                <span className="text-white/70">Name</span>
                                                <span className="text-white font-bold">{courseData.certificationDetails.name}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-white/10 pb-3">
                                                <span className="text-white/70">Provider</span>
                                                <span className="text-white font-bold">{courseData.certificationDetails.provider}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-white/10 pb-3">
                                                <span className="text-white/70">Exam Code</span>
                                                <span className="text-white font-bold">{courseData.certificationDetails.examCode}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-white/70">Validity</span>
                                                <span className="text-white font-bold">{courseData.certificationDetails.validity}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                                        <h3 className="font-bold text-white mb-4">Exam Details</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between border-b border-white/10 pb-3">
                                                <span className="text-white/70">Format</span>
                                                <span className="text-white font-bold">{courseData.certificationDetails.examFormat}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-white/10 pb-3">
                                                <span className="text-white/70">Passing Score</span>
                                                <span className="text-white font-bold">{courseData.certificationDetails.passingScore}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-white/70">Recognition</span>
                                                <span className="text-white font-bold text-sm">{courseData.certificationDetails.recognition}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 bg-brand-green/10 rounded-3xl -rotate-3" />
                                <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-brand-green/20 p-8 bg-white">
                                    <div className="text-center">
                                        <div className="w-20 h-20 rounded-full bg-brand-green/10 flex items-center justify-center mx-auto mb-6">
                                            <Award className="w-10 h-10 text-brand-green" />
                                        </div>
                                        <h3 className="font-display text-2xl text-brand-navy mb-2">{courseData.certificationDetails.name}</h3>
                                        <p className="text-brand-green font-bold text-sm uppercase tracking-wider mb-4">{courseData.certificationDetails.provider}</p>
                                        <p className="text-gray-500 text-xs">Globally Recognized Expert Certification</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ===== TARGET AUDIENCE & PREREQUISITES ===== */}
                <section className="py-20 px-6">
                    <div className="mx-auto max-w-7xl">
                        <div className="grid lg:grid-cols-2 gap-12">
                            <div>
                                <span className="inline-block px-3 py-1 rounded-full bg-brand-green/10 text-brand-green text-[10px] font-bold tracking-[0.3em] uppercase mb-4">TARGET AUDIENCE</span>
                                <h2 className="font-display text-3xl md:text-4xl text-[var(--text-primary)] mb-6">Who Should Take <span className="text-brand-green">This Course?</span></h2>
                                <p className="text-[var(--text-secondary)] mb-8">This course is designed for Excel users ready to advance to expert level.</p>
                                <div className="space-y-4">
                                    {courseData.targetAudience.map((audience, index) => (
                                        <div key={index} className="flex items-center gap-4 p-4 bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)]">
                                            <div className="w-8 h-8 rounded-full bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                                                <Check className="w-5 h-5 text-brand-green" />
                                            </div>
                                            <p className="text-[var(--text-secondary)] font-body">{audience}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <span className="inline-block px-3 py-1 rounded-full bg-brand-orange/10 text-brand-orange text-[10px] font-bold tracking-[0.3em] uppercase mb-4">PREREQUISITES</span>
                                <h2 className="font-display text-3xl md:text-4xl text-[var(--text-primary)] mb-6">Prerequisites</h2>
                                <p className="text-[var(--text-secondary)] mb-8">Basic knowledge required for this advanced course.</p>
                                <div className="space-y-4">
                                    {courseData.prerequisites.map((prereq, index) => (
                                        <div key={index} className="flex items-center gap-4 p-4 bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)]">
                                            <div className="w-8 h-8 rounded-full bg-brand-orange/10 flex items-center justify-center flex-shrink-0">
                                                <Check className="w-5 h-5 text-brand-orange" />
                                            </div>
                                            <p className="text-[var(--text-secondary)] font-body">{prereq}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ===== CAREER OUTCOMES ===== */}
                <section className="py-20 px-6 bg-[var(--section-bg-alt)]">
                    <div className="mx-auto max-w-7xl text-center">
                        <span className="inline-block px-3 py-1 rounded-full bg-brand-green/10 text-brand-green text-[10px] font-bold tracking-[0.3em] uppercase mb-4">CAREER PATH</span>
                        <h2 className="font-display text-3xl md:text-4xl text-[var(--text-primary)] mb-4">Career <span className="text-brand-green">Outcomes</span></h2>
                        <p className="text-[var(--text-secondary)] max-w-2xl mx-auto mb-12">Completing this course opens doors to advanced data analysis and business intelligence career opportunities.</p>
                        <div className="flex flex-wrap justify-center gap-4">
                            {courseData.careerOutcomes.map((outcome, index) => (
                                <span key={index} className="px-6 py-3 rounded-full bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] font-body hover:bg-brand-green/10 hover:text-brand-green hover:border-brand-green transition-all">
                                    {outcome}
                                </span>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ===== TESTIMONIAL ===== */}
                <section className="py-20 px-6">
                    <div className="mx-auto max-w-5xl">
                        <div className="bg-brand-navy rounded-3xl p-12 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-2 bg-brand-green" />
                            <div className="absolute top-8 left-8 w-16 h-16 bg-brand-green/10 rounded-full" />
                            <div className="absolute top-8 right-8 w-16 h-16 bg-brand-green/10 rounded-full" />
                            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-24 h-24 bg-brand-green/10 rounded-full" />
                            <Quote className="w-12 h-12 text-brand-green/20 mx-auto mb-6" />
                            <p className="text-white/80 text-xl md:text-2xl font-body italic mb-8 max-w-3xl mx-auto">
                                {courseData.testimonial.quote}
                            </p>
                            <div className="flex items-center justify-center gap-4">
                                <div className="w-16 h-16 rounded-2xl overflow-hidden">
                                    <img src="/testimonial-excel-expert.jpg" alt={courseData.testimonial.originalName} className="w-full h-full object-cover" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-white text-lg">{courseData.testimonial.name}</p>
                                    <p className="text-white/60">
                                        ({courseData.testimonial.originalName && <s className="text-white/40">{courseData.testimonial.originalName}</s>})
                                    </p>
                                    <p className="text-brand-green font-bold text-sm uppercase tracking-wider">
                                        {courseData.testimonial.role}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ===== RELATED COURSES ===== */}
                <section className="py-20 px-6">
                    <div className="mx-auto max-w-7xl">
                        <h2 className="font-display text-3xl md:text-4xl text-[var(--text-primary)] mb-4 text-center">Related <span className="text-brand-green">Courses</span></h2>
                        <p className="text-[var(--text-secondary)] text-center mb-12 max-w-2xl mx-auto">Explore other Microsoft Office courses</p>
                        <div className="grid md:grid-cols-3 gap-6">
                            {courseData.relatedCourses.map((course, index) => (
                                <Link key={index} href={course.href} className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] shadow-[var(--card-shadow)] overflow-hidden transition-all hover:shadow-[var(--card-shadow-hover)] hover:translate-y-[-4px] group">
                                    <div className="h-48 bg-gradient-to-br from-brand-green/10 to-brand-navy/5" />
                                    <div className="p-6">
                                        <h3 className="font-display text-xl text-[var(--text-primary)] mb-2 group-hover:text-brand-green transition-colors">{course.title}</h3>
                                        <p className="text-sm text-brand-green font-bold uppercase tracking-wider mb-4">Learn More <ArrowRight size={14} className="inline" /></p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ===== REGISTRATION FORM ===== */}
                <section id="register" className="py-20 px-6 bg-brand-navy">
                    <div className="mx-auto max-w-4xl">
                        <div className="text-center mb-12">
                            <span className="inline-block px-3 py-1 rounded-full bg-brand-green/20 text-brand-green text-[10px] font-bold tracking-[0.3em] uppercase mb-4">ENROLL NOW</span>
                            <h2 className="font-display text-4xl md:text-5xl text-white mb-4">Ready to Master <span className="text-brand-green">Excel at Expert Level?</span></h2>
                            <p className="text-white/70 text-lg">Register for {courseData.title} today</p>
                        </div>
                        <div className="bg-[var(--card-bg)] rounded-[2rem] p-8 border border-white/10 shadow-2xl">
                            <form className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2">Full Name *</label>
                                        <input type="text" required className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green/50" placeholder="Your full name" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2">Email *</label>
                                        <input type="email" required className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green/50" placeholder="your@email.com" />
                                    </div>
                                </div>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2">Phone Number *</label>
                                        <input type="tel" required className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green/50" placeholder="+234 801 234 5678" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2">Preferred Schedule</label>
                                        <select className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green/50">
                                            <option>Weekday Morning</option>
                                            <option>Weekday Evening</option>
                                            <option>Weekend</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">Message (Optional)</label>
                                    <textarea rows={4} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green/50 resize-none" placeholder="Any questions about the course?" />
                                </div>
                                <button type="submit" className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-brand-green text-white font-bold uppercase tracking-widest text-sm hover:bg-brand-green-dark transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]">
                                    Register for {courseData.shortTitle} <ArrowRight size={16} />
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