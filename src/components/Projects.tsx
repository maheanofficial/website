import './Projects.css';

const Projects = () => {
    const projects = [
        {
            id: 1,
            title: 'রোমান্টিক গল্প সংকলন',
            description: 'রোমান্টিক ও আবেগপূর্ণ গল্প গভীর অনুভূতি দিয়ে বর্ণনা করা। ভালোবাসা, সম্পর্ক ও জীবনের বাস্তবতা হৃদয়স্পর্শী কণ্ঠে বলা।',
            technologies: ['Romantic Stories', 'Emotional Narration', 'Bangla Voice', 'Popular Series'],
            gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            link: 'https://www.youtube.com/@maheanstoryvoice'
        },
        {
            id: 2,
            title: 'বাংলা অডিওবুক',
            description: 'স্বাভাবিক ও পরিষ্কার কণ্ঠে সম্পূর্ণ অডিওবুক সংগ্রহ। গল্প যা পড়ার জন্য নয়, শোনার জন্য তৈরি।',
            technologies: ['Audiobook', 'Full Narration', 'Natural Voice', 'High Quality'],
            gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            link: 'https://www.youtube.com/@maheanstoryvoice'
        },
        {
            id: 3,
            title: 'ধারাবাহিক উপন্যাস পাঠ',
            description: 'ধারাবাহিক উপন্যাস পাঠ যা বাংলা সাহিত্যকে জীবন্ত করে তোলে। প্রতিটি এপিসোড আবেগ ও বাস্তব গল্প বলার সাথে তৈরি।',
            technologies: ['Novel Series', 'Episode Format', 'Literary Work', 'Subscriber Favorite'],
            gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            link: 'https://www.youtube.com/@maheanstoryvoice'
        },
        {
            id: 4,
            title: 'ইমোশনাল গল্প',
            description: 'যন্ত্রণা, ভালোবাসা, সম্পর্ক ও মানুষের অনুভূতি নিয়ে গভীর আবেগপূর্ণ গল্প। কণ্ঠের বর্ণনা যা আত্মাকে ছুঁয়ে যায়।',
            technologies: ['Emotional Content', 'Heart-touching', 'Realistic Stories', 'Viral Content'],
            gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            link: 'https://www.youtube.com/@maheanstoryvoice'
        },
        {
            id: 5,
            title: 'শান্ত ও স্বচ্ছ ভয়েস ন্যারেশন',
            description: 'শান্ত, পরিষ্কার ও স্বাভাবিক কণ্ঠের বর্ণনা। বিশ্রাম ও নিমগ্ন গল্প বলার অভিজ্ঞতার জন্য নিখুঁত।',
            technologies: ['Clear Voice', 'Professional Quality', 'Soothing Narration', 'ASMR Quality'],
            gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            link: 'https://www.youtube.com/@maheanstoryvoice'
        },
        {
            id: 6,
            title: 'প্রেম ও সম্পর্কের গল্প',
            description: 'ভালোবাসা, সম্পর্ক ও মানুষের সংযোগ নিয়ে গল্প। সত্যতা ও আবেগের গভীরতা দিয়ে বর্ণনা করা।',
            technologies: ['Love Stories', 'Relationship Drama', 'Popular Genre', 'Trending'],
            gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
            link: 'https://www.youtube.com/@maheanstoryvoice'
        }
    ];

    return (
        <section id="projects" className="section projects-section">
            <div className="container">
                <div className="section-header fade-in-up">
                    <h2 className="section-title">
                        বিশেষ কনটেন্ট
                    </h2>
                    <p className="section-subtitle">
                        কিছু গল্প পড়ার নয়—শোনার জন্যই তৈরি 🎧
                    </p>
                </div>

                <div className="projects-grid">
                    {projects.map((project, index) => (
                        <div
                            key={project.id}
                            className="project-card card"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            <div
                                className="project-gradient"
                                style={{ background: project.gradient }}
                            />

                            <div className="project-content">
                                <h3 className="project-title">{project.title}</h3>
                                <p className="project-description">{project.description}</p>

                                <div className="project-technologies">
                                    {project.technologies.map((tech, i) => (
                                        <span key={i} className="project-tech-tag">
                                            {tech}
                                        </span>
                                    ))}
                                </div>

                                <a href={project.link} target="_blank" rel="noopener noreferrer" className="project-link">
                                    <span>YouTube এ শুনুন</span>
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M4.5 10H15.5M15.5 10L10.5 5M15.5 10L10.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </a>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="youtube-cta" style={{ textAlign: 'center', marginTop: 'var(--spacing-xl)' }}>
                    <a
                        href="https://www.youtube.com/@maheanstoryvoice?sub_confirmation=1"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                        style={{ fontSize: 'var(--text-lg)', padding: 'var(--spacing-md) var(--spacing-lg)' }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ marginRight: '8px' }}>
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="currentColor" />
                        </svg>
                        <span>YouTube এ সাবসক্রাইব করুন</span>
                    </a>
                </div>
            </div>
        </section>
    );
};

export default Projects;
