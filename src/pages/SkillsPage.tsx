import SEO from '../components/SEO';
import Skills from '../components/Skills';

const SkillsPage = () => {
    return (
        <>
            <SEO
                title="Skills"
                description="Voice, narration, and audio production skills by Mahean Ahmed."
                keywords="Mahean Ahmed, Voice Artist, Audio Production, Bangla Narration, Storytelling"
                canonicalUrl="/skills"
            />
            <div className="page-offset">
                <Skills />
            </div>
        </>
    );
};

export default SkillsPage;
