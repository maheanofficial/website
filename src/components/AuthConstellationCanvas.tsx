import { useEffect, useRef } from 'react';

type Star = {
    x: number;
    y: number;
    vx: number;
    vy: number;
};

type AuthConstellationCanvasProps = {
    className?: string;
    starCount?: number;
    maxLinkDistance?: number;
};

const AuthConstellationCanvas = ({
    className = 'auth-constellation-canvas',
    starCount = 70,
    maxLinkDistance = 150
}: AuthConstellationCanvasProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        const parent = canvas.parentElement;
        const stars: Star[] = [];

        const resizeCanvas = () => {
            canvas.width = parent?.clientWidth || window.innerWidth;
            canvas.height = parent?.clientHeight || window.innerHeight;
        };

        resizeCanvas();

        for (let index = 0; index < starCount; index += 1) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3
            });
        }

        let animationFrameId = 0;
        const animate = () => {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.fillStyle = 'rgba(255, 255, 255, 0.85)';
            context.strokeStyle = 'rgba(255, 255, 255, 0.14)';

            stars.forEach((star, starIndex) => {
                star.x += star.vx;
                star.y += star.vy;

                if (star.x <= 0 || star.x >= canvas.width) star.vx *= -1;
                if (star.y <= 0 || star.y >= canvas.height) star.vy *= -1;

                context.beginPath();
                context.arc(star.x, star.y, 1.4, 0, Math.PI * 2);
                context.fill();

                for (let nextIndex = starIndex + 1; nextIndex < stars.length; nextIndex += 1) {
                    const nextStar = stars[nextIndex];
                    const dx = star.x - nextStar.x;
                    const dy = star.y - nextStar.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < maxLinkDistance) {
                        context.beginPath();
                        context.moveTo(star.x, star.y);
                        context.lineTo(nextStar.x, nextStar.y);
                        context.stroke();
                    }
                }
            });

            animationFrameId = window.requestAnimationFrame(animate);
        };

        animationFrameId = window.requestAnimationFrame(animate);

        window.addEventListener('resize', resizeCanvas);
        return () => {
            window.cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', resizeCanvas);
        };
    }, [maxLinkDistance, starCount]);

    return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
};

export default AuthConstellationCanvas;
