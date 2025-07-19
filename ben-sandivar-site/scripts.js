// NAV SCROLL DETECTION
window.addEventListener('scroll', () => {
  const nav = document.querySelector('.navbar');
  if (nav) {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  }
});

// Centralized Project Data
const allProjects = {
  // Design & Branding Projects
  leap: {
    title: "LEAP",
    year: 2022,
    tags: ["Design & Branding", "Concept", "Startup"],
    heroImage: "https://github.com/BenS-UI/portfolio/blob/main/LEAP%20(2).jpg?raw=true",
    thumbnail: "https://github.com/BenS-UI/portfolio/blob/main/LEAP%20(2).jpg?raw=true",
    description: "Brand identity for a forward-thinking educational startup focused on innovative learning methodologies. LEAP represents a bold step into the future of education with a clean, modern visual language that speaks to both students and educators.",
    gallery: [
      "https://github.com/BenS-UI/portfolio/blob/main/LEAP%20(2).jpg?raw=true",
      "https://via.placeholder.com/600x400/667EEA/FFFFFF?text=LEAP+Logo+Variations",
      "https://via.placeholder.com/600x400/764BA2/FFFFFF?text=LEAP+Brand+Guidelines",
      "https://via.placeholder.com/600x400/F093FB/FFFFFF?text=LEAP+Application"
    ]
  },
  slides: {
    title: "SLIDES",
    year: 2023,
    tags: ["Design & Branding", "AI", "Learning"],
    heroImage: "https://raw.githubusercontent.com/BenS-UI/portfolio/refs/heads/main/Slides%20Alpha.png",
    thumbnail: "https://github.com/BenS-UI/portfolio/blob/main/SLIDES.png?raw=true",
    description: "A revolutionary language learning tool that enhances vocabulary retention through AI-powered visual associations. SLIDES combines cutting-edge technology with intuitive design to create an immersive learning experience.",
    gallery: [
      "https://raw.githubusercontent.com/BenS-UI/portfolio/refs/heads/main/Slides%20Alpha.png",
      "https://via.placeholder.com/600x400/4FACFE/FFFFFF?text=SLIDES+Interface",
      "https://via.placeholder.com/600x400/00F2FE/FFFFFF?text=AI+Visual+Engine",
      "https://via.placeholder.com/600x400/43CBFF/FFFFFF?text=Learning+Analytics"
    ]
  },
  "personal-branding": {
    title: "Personal Branding",
    year: 2024,
    tags: ["Design & Branding", "Identity", "Creative"],
    heroImage: "https://github.com/BenS-UI/portfolio/blob/main/Ben%20Sandivar.jpg?raw=true",
    thumbnail: "https://github.com/BenS-UI/portfolio/blob/main/1.png?raw=true",
    description: "A comprehensive personal brand identity that reflects creativity, innovation, and technical expertise. This project encompasses logo design, color palette, typography, and visual guidelines for consistent brand communication.",
    gallery: [
      "https://github.com/BenS-UI/portfolio/blob/main/Ben%20Sandivar.jpg?raw=true",
      "https://via.placeholder.com/600x400/667EEA/FFFFFF?text=Brand+Guidelines",
      "https://via.placeholder.com/600x400/764BA2/FFFFFF?text=Logo+System",
      "https://via.placeholder.com/600x400/F093FB/FFFFFF?text=Brand+Applications"
    ]
  },
  "cover-art": {
    title: "Cover Art Design",
    year: 2023,
    tags: ["Design & Branding", "Music", "Visual Art"],
    heroImage: "https://github.com/BenS-UI/portfolio/blob/main/Gente%20Como%20T%C3%BA.jpg?raw=true",
    thumbnail: "https://github.com/BenS-UI/portfolio/blob/main/Gente%20Como%20T%C3%BA.jpg?raw=true",
    description: "Album cover design that captures the essence of contemporary music through bold visual storytelling. This project showcases the intersection of music and visual art, creating compelling imagery that resonates with listeners.",
    gallery: [
      "https://github.com/BenS-UI/portfolio/blob/main/Gente%20Como%20T%C3%BA.jpg?raw=true",
      "https://via.placeholder.com/600x400/FF6B6B/FFFFFF?text=Cover+Variations",
      "https://via.placeholder.com/600x400/4ECDC4/FFFFFF?text=Typography+Study",
      "https://via.placeholder.com/600x400/45B7D1/FFFFFF?text=Color+Exploration"
    ]
  },
  "poster-design": {
    title: "Concert Poster Design",
    year: 2024,
    tags: ["Design & Branding", "Event", "Typography"],
    heroImage: "https://github.com/BenS-UI/portfolio/blob/main/concierto-20.4.24-DXyH9Xtm.jpg?raw=true",
    thumbnail: "https://github.com/BenS-UI/portfolio/blob/main/concierto-20.4.24-DXyH9Xtm.jpg?raw=true",
    description: "Dynamic poster design for live music events, combining bold typography with striking visual elements. This design captures the energy and atmosphere of live performance while maintaining clear information hierarchy.",
    gallery: [
      "https://github.com/BenS-UI/portfolio/blob/main/concierto-20.4.24-DXyH9Xtm.jpg?raw=true",
      "https://via.placeholder.com/600x400/FF9F43/FFFFFF?text=Typography+Layout",
      "https://via.placeholder.com/600x400/10AC84/FFFFFF?text=Color+Scheme",
      "https://via.placeholder.com/600x400/EE5A6F/FFFFFF?text=Final+Applications"
    ]
  },
  // AI & Apps Projects
  emma: {
    title: "Emma",
    year: 2024,
    tags: ["AI", "Assistant", "UX", "Mental Wellness"],
    heroImage: "https://github.com/BenS-UI/portfolio/blob/main/Emma%20tn.jpg?raw=true",
    thumbnail: "https://github.com/BenS-UI/portfolio/blob/main/Emma%20tn.jpg?raw=true",
    description: "Emma is a revolutionary AI voice assistant specifically designed for mental wellness and emotional support. With advanced natural language processing and empathetic responses, Emma provides personalized guidance and companionship for users seeking mental health support.",
    gallery: [
      "https://github.com/BenS-UI/portfolio/blob/main/Emma%20tn.jpg?raw=true",
      "https://via.placeholder.com/600x400/6C5CE7/FFFFFF?text=Emma+Interface",
      "https://via.placeholder.com/600x400/A29BFE/FFFFFF?text=AI+Conversation+Flow",
      "https://via.placeholder.com/600x400/74B9FF/FFFFFF?text=Wellness+Dashboard"
    ]
  },
  iceberg: {
    title: "Iceberg",
    year: 2023,
    tags: ["AI", "Data Visualization", "Analytics"],
    heroImage: "https://github.com/BenS-UI/portfolio/blob/main/Iceberg.png?raw=true",
    thumbnail: "https://github.com/BenS-UI/portfolio/blob/main/Iceberg.png?raw=true",
    description: "Iceberg is a powerful data analytics platform that reveals hidden insights beneath the surface of complex datasets. Using AI-driven analysis and intuitive visualization, it helps users discover patterns and trends that would otherwise remain hidden.",
    gallery: [
      "https://github.com/BenS-UI/portfolio/blob/main/Iceberg.png?raw=true",
      "https://via.placeholder.com/600x400/00B894/FFFFFF?text=Data+Visualization",
      "https://via.placeholder.com/600x400/00CEC9/FFFFFF?text=AI+Analytics+Engine",
      "https://via.placeholder.com/600x400/55A3FF/FFFFFF?text=User+Interface"
    ]
  },
  zen: {
    title: "Zen Meditation App",
    year: 2024,
    tags: ["AI", "Wellness", "Mobile", "UX"],
    heroImage: "https://github.com/BenS-UI/portfolio/blob/main/ZEN.jpg?raw=true",
    thumbnail: "https://github.com/BenS-UI/portfolio/blob/main/ZEN.jpg?raw=true",
    description: "Zen is a mindfulness and meditation app that uses AI to personalize meditation experiences based on user mood, stress levels, and preferences. The app features guided meditations, breathing exercises, and ambient soundscapes.",
    gallery: [
      "https://github.com/BenS-UI/portfolio/blob/main/ZEN.jpg?raw=true",
      "https://via.placeholder.com/600x400/6C5CE7/FFFFFF?text=Meditation+Interface",
      "https://via.placeholder.com/600x400/A29BFE/FFFFFF?text=Mood+Tracking",
      "https://via.placeholder.com/600x400/74B9FF/FFFFFF?text=Progress+Analytics"
    ]
  },
  vise: {
    title: "Vise",
    year: 2023,
    tags: ["AI", "Productivity", "Automation"],
    heroImage: "https://github.com/BenS-UI/portfolio/blob/main/Vise.png?raw=true",
    thumbnail: "https://github.com/BenS-UI/portfolio/blob/main/Vise.png?raw=true",
    description: "Vise is an AI-powered productivity tool that helps users organize, prioritize, and automate their daily tasks. With smart scheduling and intelligent task management, Vise adapts to user behavior to optimize productivity.",
    gallery: [
      "https://github.com/BenS-UI/portfolio/blob/main/Vise.png?raw=true",
      "https://via.placeholder.com/600x400/FD79A8/FFFFFF?text=Task+Management",
      "https://via.placeholder.com/600x400/FDCB6E/FFFFFF?text=AI+Scheduling",
      "https://via.placeholder.com/600x400/6C5CE7/FFFFFF?text=Productivity+Analytics"
    ]
  },
  cabin: {
    title: "Cabin",
    year: 2024,
    tags: ["AI", "Remote Work", "Collaboration"],
    heroImage: "https://github.com/BenS-UI/portfolio/blob/main/Cabin%20Cover.jpg?raw=true",
    thumbnail: "https://github.com/BenS-UI/portfolio/blob/main/Cabin%20Cover.jpg?raw=true",
    description: "Cabin is a virtual workspace platform designed for remote teams. It combines AI-powered collaboration tools with immersive virtual environments to create engaging remote work experiences that foster creativity and productivity.",
    gallery: [
      "https://github.com/BenS-UI/portfolio/blob/main/Cabin%20Cover.jpg?raw=true",
      "https://via.placeholder.com/600x400/00B894/FFFFFF?text=Virtual+Workspace",
      "https://via.placeholder.com/600x400/00CEC9/FFFFFF?text=Collaboration+Tools",
      "https://via.placeholder.com/600x400/74B9FF/FFFFFF?text=Team+Analytics"
    ]
  },
  pearl: {
    title: "Pearl",
    year: 2024,
    tags: ["AI", "Creative", "Content Generation"],
    heroImage: "https://github.com/BenS-UI/portfolio/blob/main/Pearl.jpg?raw=true",
    thumbnail: "https://github.com/BenS-UI/portfolio/blob/main/Pearl.jpg?raw=true",
    description: "Pearl is an AI-powered creative writing assistant that helps authors, bloggers, and content creators generate high-quality written content. With advanced language models and creative prompts, Pearl enhances the writing process.",
    gallery: [
      "https://github.com/BenS-UI/portfolio/blob/main/Pearl.jpg?raw=true",
      "https://via.placeholder.com/600x400/E17055/FFFFFF?text=Writing+Interface",
      "https://via.placeholder.com/600x400/F39C12/FFFFFF?text=AI+Suggestions",
      "https://via.placeholder.com/600x400/8E44AD/FFFFFF?text=Content+Analytics"
    ]
  },
  // Music & Production Projects
  "gente-como-tu": {
    title: "Gente Como Tú",
    year: 2023,
    tags: ["Music & Production", "Original Song", "Pop"],
    heroImage: "https://github.com/BenS-UI/portfolio/blob/main/Gente%20Como%20T%C3%BA.jpg?raw=true",
    thumbnail: "https://github.com/BenS-UI/portfolio/blob/main/Gente%20Como%20T%C3%BA.jpg?raw=true",
    description: "An original pop song that explores themes of connection and identity in the modern world. This track showcases contemporary production techniques with heartfelt lyrics and memorable melodies that resonate with diverse audiences.",
    gallery: [
      "https://github.com/BenS-UI/portfolio/blob/main/Gente%20Como%20T%C3%BA.jpg?raw=true",
      "https://via.placeholder.com/600x400/FF6B6B/FFFFFF?text=Studio+Session",
      "https://via.placeholder.com/600x400/4ECDC4/FFFFFF?text=Production+Process",
      "https://via.placeholder.com/600x400/45B7D1/FFFFFF?text=Music+Video+Stills"
    ]
  },
  underneath: {
    title: "Underneath",
    year: 2024,
    tags: ["Music & Production", "Alternative", "Indie"],
    heroImage: "https://github.com/BenS-UI/portfolio/blob/main/Underneath%20Cover.jpg?raw=true",
    thumbnail: "https://github.com/BenS-UI/portfolio/blob/main/Underneath%20Cover.jpg?raw=true",
    description: "An introspective alternative track that delves into themes of self-discovery and hidden emotions. Featuring layered instrumentation and atmospheric production, 'Underneath' creates an immersive sonic landscape.",
    gallery: [
      "https://github.com/BenS-UI/portfolio/blob/main/Underneath%20Cover.jpg?raw=true",
      "https://via.placeholder.com/600x400/9B59B6/FFFFFF?text=Recording+Setup",
      "https://via.placeholder.com/600x400/3498DB/FFFFFF?text=Sound+Design",
      "https://via.placeholder.com/600x400/E74C3C/FFFFFF?text=Mixing+Console"
    ]
  },
  alma: {
    title: "AʟᴍA",
    year: 2023,
    tags: ["Music & Production", "Electronic", "Ambient"],
    heroImage: "https://github.com/BenS-UI/portfolio/blob/main/ALMA.png?raw=true",
    thumbnail: "https://github.com/BenS-UI/portfolio/blob/main/ALMA.png?raw=true",
    description: "AʟᴍA is an experimental electronic composition that blends ambient textures with rhythmic elements. This piece explores the intersection of organic and synthetic sounds, creating a meditative yet dynamic listening experience.",
    gallery: [
      "https://github.com/BenS-UI/portfolio/blob/main/ALMA.png?raw=true",
      "https://via.placeholder.com/600x400/2ECC71/FFFFFF?text=Synthesizer+Setup",
      "https://via.placeholder.com/600x400/F39C12/FFFFFF?text=Digital+Audio+Workstation",
      "https://via.placeholder.com/600x400/9B59B6/FFFFFF?text=Live+Performance"
    ]
  },
  blackrose: {
    title: "BlackRose",
    year: 2024,
    tags: ["Music & Production", "Dark Pop", "Cinematic"],
    heroImage: "https://github.com/BenS-UI/portfolio/blob/main/BlackRose.jpg?raw=true",
    thumbnail: "https://github.com/BenS-UI/portfolio/blob/main/BlackRose.jpg?raw=true",
    description: "BlackRose is a haunting dark pop track with cinematic elements that tell a story of transformation and resilience. The production combines orchestral arrangements with modern electronic elements.",
    gallery: [
      "https://github.com/BenS-UI/portfolio/blob/main/BlackRose.jpg?raw=true",
      "https://via.placeholder.com/600x400/34495E/FFFFFF?text=Orchestral+Recording",
      "https://via.placeholder.com/600x400/E74C3C/FFFFFF?text=Vocal+Production",
      "https://via.placeholder.com/600x400/8E44AD/FFFFFF?text=Final+Mix"
    ]
  },
  siberia: {
    title: "Siberia",
    year: 2023,
    tags: ["Music & Production", "Ambient", "Soundscape"],
    heroImage: "https://github.com/BenS-UI/portfolio/blob/main/Siberia.jpg?raw=true",
    thumbnail: "https://github.com/BenS-UI/portfolio/blob/main/Siberia.jpg?raw=true",
    description: "Siberia is an atmospheric soundscape that captures the vastness and isolation of remote landscapes. Using field recordings and ambient synthesis, this piece creates an immersive environmental experience.",
    gallery: [
      "https://github.com/BenS-UI/portfolio/blob/main/Siberia.jpg?raw=true",
      "https://via.placeholder.com/600x400/5DADE2/FFFFFF?text=Field+Recordings",
      "https://via.placeholder.com/600x400/85C1E9/FFFFFF?text=Ambient+Synthesis",
      "https://via.placeholder.com/600x400/AED6F1/FFFFFF?text=Sound+Design"
    ]
  },
  // Writing & Art Projects
  "the-arcane": {
    title: "The Arcane",
    year: 2024,
    tags: ["Writing & Art", "Novel", "Fantasy"],
    heroImage: "https://github.com/BenS-UI/portfolio/blob/main/Book%20Cover.jpg?raw=true",
    thumbnail: "https://github.com/BenS-UI/portfolio/blob/main/Book%20Cover.jpg?raw=true",
    description: "The Arcane is a fantasy novel that explores themes of magic, power, and responsibility in a world where ancient forces collide with modern society. This work combines rich world-building with complex character development.",
    gallery: [
      "https://github.com/BenS-UI/portfolio/blob/main/Book%20Cover.jpg?raw=true",
      "https://via.placeholder.com/600x400/6C5CE7/FFFFFF?text=Character+Sketches",
      "https://via.placeholder.com/600x400/A29BFE/FFFFFF?text=World+Map",
      "https://via.placeholder.com/600x400/74B9FF/FFFFFF?text=Manuscript+Pages"
    ]
  },
  "a-dark-place": {
    title: "A Dark Place",
    year: 2023,
    tags: ["Writing & Art", "Short Story", "Thriller"],
    heroImage: "https://github.com/BenS-UI/portfolio/blob/main/A%20Dark%20Place.jpg?raw=true",
    thumbnail: "https://github.com/BenS-UI/portfolio/blob/main/A%20Dark%20Place.jpg?raw=true",
    description: "A psychological thriller short story that explores the depths of human nature when confronted with moral ambiguity. This narrative challenges readers to question their assumptions about right and wrong.",
    gallery: [
      "https://github.com/BenS-UI/portfolio/blob/main/A%20Dark%20Place.jpg?raw=true",
      "https://via.placeholder.com/600x400/2D3436/FFFFFF?text=Story+Outline",
      "https://via.placeholder.com/600x400/636E72/FFFFFF?text=Character+Development",
      "https://via.placeholder.com/600x400/B2BEC3/FFFFFF?text=Published+Version"
    ]
  },
  downfall: {
    title: "Downfall",
    year: 2024,
    tags: ["Writing & Art", "Screenplay", "Drama"],
    heroImage: "https://github.com/BenS-UI/portfolio/blob/main/Downfall%20Cover.jpg?raw=true",
    thumbnail: "https://github.com/BenS-UI/portfolio/blob/main/Downfall%20Cover.jpg?raw=true",
    description: "Downfall is a dramatic screenplay that examines the consequences of ambition and the price of success. Set in the corporate world, it follows characters as they navigate ethical dilemmas and personal relationships.",
    gallery: [
      "https://github.com/BenS-UI/portfolio/blob/main/Downfall%20Cover.jpg?raw=true",
      "https://via.placeholder.com/600x400/D63031/FFFFFF?text=Script+Pages",
      "https://via.placeholder.com/600x400/74B9FF/FFFFFF?text=Character+Breakdown",
      "https://via.placeholder.com/600x400/00B894/FFFFFF?text=Scene+Storyboard"
    ]
  },
  "blackhat-whitehat": {
    title: "BlackHat, WhiteHat",
    year: 2023,
    tags: ["Writing & Art", "Cyberpunk", "Novella"],
    heroImage: "https://github.com/BenS-UI/portfolio/blob/main/blackhat.jpg?raw=true",
    thumbnail: "https://github.com/BenS-UI/portfolio/blob/main/blackhat.jpg?raw=true",
    description: "A cyberpunk novella exploring the blurred lines between ethical hacking and cybercrime. Set in a near-future world, it follows hackers on both sides of the law as they navigate a complex digital landscape.",
    gallery: [
      "https://github.com/BenS-UI/portfolio/blob/main/blackhat.jpg?raw=true",
      "https://via.placeholder.com/600x400/2D3436/FFFFFF?text=Cyberpunk+Aesthetic",
      "https://via.placeholder.com/600x400/00CEC9/FFFFFF?text=Digital+Illustrations",
      "https://via.placeholder.com/600x400/6C5CE7/FFFFFF?text=Tech+Concepts"
    ]
  },
  "poetry-collection": {
    title: "Poetry Collection",
    year: 2024,
    tags: ["Writing & Art", "Poetry", "Contemporary"],
    heroImage: "https://via.placeholder.com/600x400/667EEA/FFFFFF?text=Poetry+Collection",
    thumbnail: "https://via.placeholder.com/300x200/667EEA/FFFFFF?text=Poetry+Collection",
    description: "A collection of contemporary poems exploring themes of identity, technology, and human connection in the digital age. These works blend traditional poetic forms with modern sensibilities and language.",
    gallery: [
      "https://via.placeholder.com/600x400/667EEA/FFFFFF?text=Poetry+Collection",
      "https://via.placeholder.com/600x400/764BA2/FFFFFF?text=Handwritten+Drafts",
      "https://via.placeholder.com/600x400/F093FB/FFFFFF?text=Typography+Layout",
      "https://via.placeholder.com/600x400/4FACFE/FFFFFF?text=Published+Book"
    ]
  }
};

// Centralized Blog Post Data
const allBlogPosts = {
  "design-thinking-deep-dive": {
    title: "A Deep Dive into Design Thinking",
    date: "October 26, 2023",
    author: "Ben Sandivar",
    image: "https://via.placeholder.com/300x200/667EEA/FFFFFF?text=Design+Thinking",
    heroImage: "https://via.placeholder.com/600x400/667EEA/FFFFFF?text=Design+Thinking",
    excerpt: "Design thinking is more than a buzzword; it’s a powerful framework for innovation. Let's explore its five stages...",
    content: `
      <p>Design thinking is more than a process; it’s a mindset for creative problem solving. Originating from the world of design, it's now a staple in innovation-driven industries. But what does it really involve?</p>
      <p>At its core, design thinking comprises five stages: Empathize, Define, Ideate, Prototype, and Test. Each plays a crucial role in developing solutions that are user-centered and effective.</p>
      <p>Empathy allows designers to step into users’ shoes. Defining the problem sharpens the focus. Ideation unlocks creative possibilities, while prototyping and testing bring those ideas into the real world.</p>
      <p>Whether you're building products, crafting services, or shaping experiences, design thinking can be a transformative tool.</p>
    `,
    tags: ["Design", "Process", "Innovation"]
  },
  "ai-in-creative-design": {
    title: "Exploring AI in Creative Design",
    date: "November 15, 2023",
    author: "Ben Sandivar",
    image: "https://via.placeholder.com/300x200/764BA2/FFFFFF?text=AI+Design",
    heroImage: "https://via.placeholder.com/600x400/764BA2/FFFFFF?text=AI+Design",
    excerpt: "Artificial intelligence is transforming how we approach design. Discover its potential and challenges...",
    content: `
      <p>Artificial intelligence is no longer just a futuristic concept; it's rapidly becoming an integral part of creative industries. From generating unique art to assisting with complex design tasks, AI offers unprecedented possibilities.</p>
      <p>However, integrating AI into creative workflows also presents challenges. It requires a shift in mindset, understanding how to leverage AI as a co-creator rather than a replacement. The ethical implications of AI-generated content also need careful consideration.</p>
      <p>Ultimately, AI stands to augment human creativity, opening new avenues for innovation and allowing designers to focus on higher-level conceptual work while automating repetitive tasks.</p>
    `,
    tags: ["AI", "Design", "Innovation", "Future"]
  }
};

// Function to render Project Cards (for index.html and work.html)
function renderProjectCards(containerId, projectSlugs, isCarousel = false) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with ID '${containerId}' not found.`);
    return;
  }
  container.innerHTML = ''; // Clear existing content

  projectSlugs.forEach(slug => {
    const project = allProjects[slug];
    if (project) {
      const article = document.createElement('article');
      article.classList.add(isCarousel ? 'carousel-card' : 'project-card');
      article.setAttribute('data-parallax-speed', '0.01'); // Keep parallax for consistency

      const imageUrl = project.thumbnail || project.heroImage;

      let cardContentHtml = '';
      if (isCarousel) {
        // For carousel cards, remove the "View Project" button
        cardContentHtml = `
          <img src="${imageUrl}" alt="${project.title} Project">
          <div class="card-content">
            <h4>${project.title}</h4>
          </div>
        `;
      } else {
        // For featured project cards, keep the "View Project" link
        cardContentHtml = `
          <img src="${imageUrl}" alt="${project.title} Project" data-parallax-speed="0.01">
          <div class="card-content">
            <h4>${project.title}</h4>
            <p>${project.description}</p>
            <a href="projects/project-slug.html?slug=${slug}">View Project →</a>
          </div>
        `;
      }
      article.innerHTML = cardContentHtml;

      // Make the entire card clickable for carousel cards
      if (isCarousel) {
        article.style.cursor = 'pointer';
        article.addEventListener('click', (e) => {
          if (e.target.tagName !== 'A') { // Avoid double-click if there's an internal link (though we removed them)
            window.location.href = `projects/project-slug.html?slug=${slug}`;
          }
        });
      }

      container.appendChild(article);
    } else {
      console.warn(`Project with slug '${slug}' not found.`);
    }
  });

  // Re-apply Intersection Observer to new elements
  const newElements = container.querySelectorAll('.fade-in, .carousel-card, .project-card');
  newElements.forEach(element => observer.observe(element));
}

// Function to render Blog Cards (for blog.html)
function renderBlogCards(containerId, blogPostSlugs) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with ID '${containerId}' not found.`);
    return;
  }
  container.innerHTML = ''; // Clear existing content

  blogPostSlugs.forEach(slug => {
    const post = allBlogPosts[slug];
    if (post) {
      const article = document.createElement('article');
      article.classList.add('blog-card');
      article.innerHTML = `
        <img src="${post.image}" alt="Blog Post Image" data-parallax-speed="0.01">
        <div class="blog-meta">${post.date} · ${post.author}</div>
        <h4>${post.title}</h4>
        <p>${post.excerpt}</p>
        <a href="posts/post-slug.html?slug=${slug}" class="read-more">Read More →</a>
      `;
      container.appendChild(article);
    } else {
      console.warn(`Blog post with slug '${slug}' not found.`);
    }
  });
  // Re-apply Intersection Observer to new elements
  const newElements = container.querySelectorAll('.blog-card');
  newElements.forEach(element => observer.observe(element));
}

// Function to load Project Details for projects/project-slug.html
function loadProjectDetails() {
  const slug = new URLSearchParams(window.location.search).get("slug");
  const project = allProjects[slug];

  if (project) {
    document.title = `${project.title} — Ben Sandivar`;
    document.querySelector(".project-header h2").textContent = project.title;
    document.querySelector(".project-header .meta").textContent = `${project.year} · ${project.tags.join(" · ")}`;
    document.querySelector(".project-hero img").src = project.heroImage;
    document.querySelector(".project-hero img").alt = `${project.title} Hero Image`;
    document.querySelector(".project-description p").textContent = project.description;

    const gallery = document.querySelector(".project-gallery");
    gallery.innerHTML = "";
    project.gallery.forEach(src => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = `${project.title} gallery image`;
      gallery.appendChild(img);
    });
    // Re-initialize lightbox for new gallery images
    initLightbox();
  } else {
    document.title = "Project Not Found — Ben Sandivar";
    const mainColumn = document.querySelector(".main-column");
    mainColumn.innerHTML = `
      <div class="back-link"><a href="../work.html">← Back to Work</a></div>
      <section class="project-header">
        <h2>Project Not Found</h2>
      </section>
      <section class="project-description">
        <p>The project you are looking for does not exist.</p>
      </section>
    `;
  }
}

// Function to load Blog Post Details for posts/post-slug.html
function loadBlogPostDetails() {
  const slug = new URLSearchParams(window.location.search).get("slug");
  const post = allBlogPosts[slug];

  if (post) {
    document.title = `${post.title} — Ben Sandivar`;
    document.querySelector(".post-header h2").textContent = post.title;
    document.querySelector(".post-header .meta").textContent = `By ${post.author} · ${post.date}`;
    document.querySelector(".post-hero img").src = post.heroImage;
    document.querySelector(".post-hero img").alt = `${post.title} Post Image`;
    document.querySelector(".post-body").innerHTML = post.content;

    const tagsContainer = document.querySelector(".tags");
    if (tagsContainer) {
      tagsContainer.innerHTML = "";
      post.tags.forEach(tag => {
        const span = document.createElement("span");
        span.textContent = `#${tag}`;
        tagsContainer.appendChild(span);
      });
    }
  } else {
    document.title = "Post Not Found — Ben Sandivar";
    const mainColumn = document.querySelector(".main-column");
    mainColumn.innerHTML = `
      <div class="back-link"><a href="../blog.html">← Back to Blog</a></div>
      <section class="post-header">
        <h2>Post Not Found</h2>
      </section>
      <section class="post-body">
        <p>The blog post you are looking for does not exist.</p>
      </section>
    `;
  }
}

// Lightbox initialization and handling
function initLightbox() {
  const galleryImages = Array.from(document.querySelectorAll('.project-gallery img'));
  if (galleryImages.length > 0) {
    let currentIndex = 0;

    // Remove existing lightbox if it was created before to prevent duplicates
    let lightbox = document.getElementById('lightbox');
    if (lightbox) {
      lightbox.remove();
    }

    lightbox = document.createElement('div');
    lightbox.id = 'lightbox';
    Object.assign(lightbox.style, {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0,0,0,0.9)',
      display: 'none',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999
    });
    document.body.appendChild(lightbox);

    const img = document.createElement('img');
    Object.assign(img.style, {
      maxWidth: '90%',
      maxHeight: '90%',
      borderRadius: '1rem'
    });
    lightbox.appendChild(img);

    function showImage(index) {
      currentIndex = index;
      img.src = galleryImages[index].src;
      lightbox.style.display = 'flex';
    }

    galleryImages.forEach((image, index) => {
      // Remove previous listeners to prevent duplicates
      image.removeEventListener('click', () => showImage(index));
      image.addEventListener('click', () => showImage(index));
    });

    lightbox.addEventListener('click', (e) => {
      if (e.target !== img) lightbox.style.display = 'none';
    });

    // Centralized keydown handler to prevent multiple listeners
    document.removeEventListener('keydown', handleLightboxKeydown); // Remove old listener
    document.addEventListener('keydown', handleLightboxKeydown);
  }
}

function handleLightboxKeydown(e) {
  const lightbox = document.getElementById('lightbox');
  const galleryImages = Array.from(document.querySelectorAll('.project-gallery img'));
  if (lightbox && lightbox.style.display === 'flex') {
    let currentIndex = galleryImages.findIndex(img => img.src === lightbox.querySelector('img').src);
    if (e.key === 'Escape') {
      lightbox.style.display = 'none';
    } else if (e.key === 'ArrowRight') {
      if (currentIndex !== -1) {
        const nextIndex = (currentIndex + 1) % galleryImages.length;
        galleryImages[nextIndex].dispatchEvent(new Event('click')); // Simulate click on next image
      }
    } else if (e.key === 'ArrowLeft') {
      if (currentIndex !== -1) {
        const prevIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
        galleryImages[prevIndex].dispatchEvent(new Event('click')); // Simulate click on previous image
      }
    }
  }
}


// PAGE TRANSITION (FADE-IN)
document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('page-loaded');

  // MORE BUTTON
  const moreBtn = document.querySelector('.more-btn');
  const navLinks = document.querySelector('.nav-links');

  if (moreBtn && navLinks) {
    moreBtn.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }

  // CUSTOM CURSOR
  const cursor = document.createElement('div');
  cursor.id = 'custom-cursor';
  document.body.appendChild(cursor);

  let mouseX = 0, mouseY = 0, posX = 0, posY = 0;

  const lerp = (start, end, factor) => start + (end - start) * factor;

  function animateCursor() {
    posX = lerp(posX, mouseX, 1);
    posY = lerp(posY, mouseY, 1);
    cursor.style.transform = `translate3d(${posX}px, ${posY}px, 0)`;
    requestAnimationFrame(animateCursor);
  }
  animateCursor();

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  const hoverTargets = document.querySelectorAll('a, button');
  hoverTargets.forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
  });

  // CAROUSEL SCROLL BUTTONS AND FADE EFFECTS
  const setupCarousels = () => {
    const carousels = document.querySelectorAll('.work-page .carousel-container');
    carousels.forEach(container => {
      const track = container.querySelector('.carousel-track');
      const btnLeft = container.querySelector('.carousel-btn.left');
      const btnRight = container.querySelector('.carousel-btn.right');

      if (btnLeft && btnRight && track) {
        // Remove existing listeners to prevent duplicates after re-rendering
        const oldLeftHandler = btnLeft.onclick;
        const oldRightHandler = btnRight.onclick;
        const oldScrollHandler = track.onscroll;

        if (oldLeftHandler) btnLeft.removeEventListener('click', oldLeftHandler);
        if (oldRightHandler) btnRight.removeEventListener('click', oldRightHandler);
        if (oldScrollHandler) track.removeEventListener('scroll', oldScrollHandler);

        // Add new listeners
        const newLeftHandler = () => { track.scrollBy({ left: -240, behavior: 'smooth' }); };
        const newRightHandler = () => { track.scrollBy({ left: 240, behavior: 'smooth' }); };
        btnLeft.addEventListener('click', newLeftHandler);
        btnRight.addEventListener('click', newRightHandler);

        const updateFadeClasses = () => {
          const scrollLeft = track.scrollLeft;
          const maxScroll = track.scrollWidth - track.clientWidth;
          container.classList.toggle('fade-start', scrollLeft > 0);
          container.classList.toggle('fade-end', scrollLeft < maxScroll - 1); // Use < maxScroll - 1 for floating point precision
          btnLeft.disabled = scrollLeft <= 0;
          btnRight.disabled = scrollLeft >= maxScroll - 1;
        };
        track.addEventListener('scroll', updateFadeClasses);
        updateFadeClasses(); // Initial check
      }
    });
  };

  // INTERSECTION OBSERVER FOR FADE-IN ANIMATIONS
  const elements = document.querySelectorAll('.fade-in, .carousel-section, .carousel-card, .carousel-btn, .project-card, .blog-card');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });
  elements.forEach(element => observer.observe(element));

  // Initial rendering calls based on current page
  const currentPage = window.location.pathname.split('/').pop();

  if (currentPage === 'index.html') {
    renderProjectCards('featured-projects-container', ['slides', 'personal-branding'], false);
  } else if (currentPage === 'work.html') {
    // Render Design & Branding projects
    const designSlugs = Object.keys(allProjects).filter(slug => allProjects[slug].tags.includes('Design & Branding'));
    renderProjectCards('design-track', designSlugs, true);

    // Render AI & Apps projects
    const appsSlugs = Object.keys(allProjects).filter(slug => allProjects[slug].tags.includes('AI'));
    renderProjectCards('apps-track', appsSlugs, true);

    // Render Music & Production projects
    const musicSlugs = Object.keys(allProjects).filter(slug => allProjects[slug].tags.includes('Music & Production'));
    renderProjectCards('music-track', musicSlugs, true);

    // Render Writing & Art projects
    const writingSlugs = Object.keys(allProjects).filter(slug => allProjects[slug].tags.includes('Writing & Art'));
    renderProjectCards('writing-track', writingSlugs, true);

    setupCarousels(); // Setup carousel specific logic after dynamic content is added
  } else if (currentPage === 'blog.html') {
    const blogSlugs = Object.keys(allBlogPosts);
    renderBlogCards('blog-grid-container', blogSlugs);
  } 

  // Ensure lightbox initialization happens only for project detail page
  // and its initial call is handled by the DOMContentLoaded event listener in project-slug.html
  // The logic for 'project-slug.html' and 'post-slug.html' is now inside their respective files via script tags
});
