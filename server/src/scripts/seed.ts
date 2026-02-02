import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.model';
import { Course, Lesson } from '../models/Course.model';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/neurolearn';

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seed...\n');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({ email: 'educator@neurolearn.com' });
    await Course.deleteMany({});
    await Lesson.deleteMany({});

    // Create educator
    console.log('\n👨‍🏫 Creating educator...');
    const educator = await User.create({
      email: 'educator@neurolearn.com',
      password: 'Educator123!',
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: 'educator',
      neurodiverseProfile: {
        conditions: [],
        sensoryPreferences: {
          visualSensitivity: 'medium',
          audioSensitivity: 'medium',
          preferredLearningStyle: ['visual'],
        },
        focusSettings: {
          sessionDuration: 25,
          breakDuration: 5,
          breakReminders: true,
          distractionBlocker: false,
        },
        accessibilitySettings: {
          fontSize: 'medium',
          fontFamily: 'default',
          highContrast: false,
          reducedMotion: false,
          textToSpeech: false,
          lineSpacing: 'normal',
          colorTheme: 'light',
        },
      },
    });
    console.log(`   Created: ${educator.email}`);

    // ==================== COURSE 1: MATH ====================
    console.log('\n📚 Creating Math Adventures course...');
    const mathCourse = await Course.create({
      title: 'Math Adventures: Numbers & Counting',
      description: 'A fun, visual journey through basic math concepts. Designed with ADHD-friendly short lessons, colorful animations, and interactive games. Perfect for visual learners!',
      category: 'Mathematics',
      difficulty: 'beginner',
      tags: ['math', 'numbers', 'counting', 'adhd-friendly', 'visual-learning'],
      thumbnail: 'https://images.unsplash.com/photo-1635372722656-389f87a941b7?w=400',
      estimatedDuration: 180,
      instructor: educator._id,
      neurodiverseFeatures: {
        adhdFriendly: true,
        autismFriendly: true,
        dyslexiaFriendly: true,
        visualLearning: true,
        audioSupport: true,
        interactiveElements: true,
      },
      learningObjectives: [
        'Count numbers from 1 to 100',
        'Understand addition with visual aids',
        'Learn subtraction through games',
        'Recognize number patterns',
      ],
      isPublished: true,
      lessons: [],
    });

    // Math Lesson 1
    const mathLesson1 = await Lesson.create({
      courseId: mathCourse._id,
      title: 'Counting 1-10 with Friends',
      description: 'Learn to count from 1 to 10 using colorful animal friends!',
      order: 1,
      estimatedDuration: 10,
      contentBlocks: [
        {
          type: 'text',
          content: '# Welcome to Counting! 🎉\n\nToday we will learn to count from 1 to 10. Each number has an animal friend to help you remember!\n\n**Take your time** - there is no rush. You can pause anytime you need a break.',
        },
        {
          type: 'image',
          content: 'https://images.unsplash.com/photo-1535083783855-76ae62b2914e?w=600',
        },
        {
          type: 'text',
          content: '## Let\'s Count Together!\n\n🐱 **1** - One happy cat\n🐶🐶 **2** - Two playful dogs\n🐰🐰🐰 **3** - Three fluffy bunnies\n🐸🐸🐸🐸 **4** - Four jumping frogs\n⭐⭐⭐⭐⭐ **5** - Five shining stars',
        },
        {
          type: 'text',
          content: '🦋🦋🦋🦋🦋🦋 **6** - Six beautiful butterflies\n🌈🌈🌈🌈🌈🌈🌈 **7** - Seven colorful rainbows\n🐠🐠🐠🐠🐠🐠🐠🐠 **8** - Eight swimming fish\n🌸🌸🌸🌸🌸🌸🌸🌸🌸 **9** - Nine pretty flowers\n🎈🎈🎈🎈🎈🎈🎈🎈🎈🎈 **10** - Ten floating balloons!',
        },
      ],
      quiz: {
        questions: [
          {
            question: 'How many cats are shown? 🐱',
            options: ['1', '2', '3', '4'],
            correctAnswer: 0,
            explanation: 'There is 1 cat! One is the first number we count.',
            points: 10,
          },
          {
            question: 'What comes after 5?',
            options: ['4', '6', '7', '3'],
            correctAnswer: 1,
            explanation: 'After 5 comes 6! Great counting!',
            points: 10,
          },
          {
            question: 'Count the stars: ⭐⭐⭐⭐⭐',
            options: ['3', '4', '5', '6'],
            correctAnswer: 2,
            explanation: 'There are 5 stars! You counted perfectly!',
            points: 10,
          },
        ],
        passingScore: 70,
      },
      learningObjectives: [
        'Recognize numbers 1-10',
        'Count objects up to 10',
        'Associate numbers with quantities',
      ],
    });
    mathCourse.lessons.push(mathLesson1._id as any);
    console.log(`   + ${mathLesson1.title}`);

    // Math Lesson 2
    const mathLesson2 = await Lesson.create({
      courseId: mathCourse._id,
      title: 'Simple Addition with Pictures',
      description: 'Learn to add numbers using fun visual examples!',
      order: 2,
      estimatedDuration: 15,
      contentBlocks: [
        {
          type: 'text',
          content: '# Addition is Fun! ➕\n\nAddition means putting things together. When we add, we find out how many we have in total!\n\n**Tip:** You can use your fingers to help count!',
        },
        {
          type: 'text',
          content: '## Let\'s Try It!\n\n🍎 + 🍎 = ?\n\nIf you have 1 apple and get 1 more apple, how many apples do you have?\n\n**Answer: 2 apples!** 🍎🍎',
        },
        {
          type: 'text',
          content: '## More Examples:\n\n🌟🌟 + 🌟 = 🌟🌟🌟 (2 + 1 = 3)\n\n🎈🎈 + 🎈🎈 = 🎈🎈🎈🎈 (2 + 2 = 4)\n\n🐟 + 🐟🐟🐟 = 🐟🐟🐟🐟 (1 + 3 = 4)',
        },
      ],
      quiz: {
        questions: [
          {
            question: '1 + 1 = ?',
            options: ['1', '2', '3', '0'],
            correctAnswer: 1,
            explanation: '1 + 1 = 2. One plus one equals two!',
            points: 10,
          },
          {
            question: '🍎🍎 + 🍎 = ?',
            options: ['2', '3', '4', '1'],
            correctAnswer: 1,
            explanation: '2 apples + 1 apple = 3 apples!',
            points: 10,
          },
          {
            question: '2 + 2 = ?',
            options: ['2', '3', '4', '5'],
            correctAnswer: 2,
            explanation: '2 + 2 = 4. Great job!',
            points: 10,
          },
        ],
        passingScore: 70,
      },
      learningObjectives: [
        'Understand the concept of addition',
        'Add numbers up to 5',
        'Use visual aids for counting',
      ],
    });
    mathCourse.lessons.push(mathLesson2._id as any);
    console.log(`   + ${mathLesson2.title}`);

    await mathCourse.save();

    // ==================== COURSE 2: READING ====================
    console.log('\n📖 Creating Reading Champions course...');
    const readingCourse = await Course.create({
      title: 'Reading Champions: Phonics & Words',
      description: 'Master reading with dyslexia-friendly fonts, audio support, and multisensory learning. Each lesson uses the Orton-Gillingham approach with visual, auditory, and kinesthetic activities.',
      category: 'Reading',
      difficulty: 'beginner',
      tags: ['reading', 'phonics', 'dyslexia-friendly', 'audio-learning', 'multisensory'],
      thumbnail: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400',
      estimatedDuration: 240,
      instructor: educator._id,
      neurodiverseFeatures: {
        adhdFriendly: true,
        autismFriendly: true,
        dyslexiaFriendly: true,
        visualLearning: true,
        audioSupport: true,
        interactiveElements: true,
      },
      learningObjectives: [
        'Recognize letter sounds',
        'Blend sounds to form words',
        'Read simple sentences',
        'Build vocabulary with pictures',
      ],
      isPublished: true,
      lessons: [],
    });

    // Reading Lesson 1
    const readingLesson1 = await Lesson.create({
      courseId: readingCourse._id,
      title: 'Letter Sounds: A, B, C',
      description: 'Learn the sounds of letters A, B, and C with fun pictures and audio!',
      order: 1,
      estimatedDuration: 12,
      contentBlocks: [
        {
          type: 'text',
          content: '# Learning Letter Sounds 🔤\n\nEvery letter makes a special sound. Today we\'ll learn three letters!\n\n**Listen and repeat** each sound. Take your time!',
        },
        {
          type: 'text',
          content: '## The Letter A\n\n🍎 **A** makes the sound "ah" like in **A**pple\n\nSay it: "Ah, ah, apple!"\n\n🐜 Another example: **A**nt - "Ah, ah, ant!"',
        },
        {
          type: 'text',
          content: '## The Letter B\n\n🏀 **B** makes the sound "buh" like in **B**all\n\nSay it: "Buh, buh, ball!"\n\n🦋 Another example: **B**utterfly - "Buh, buh, butterfly!"',
        },
        {
          type: 'text',
          content: '## The Letter C\n\n🐱 **C** makes the sound "kuh" like in **C**at\n\nSay it: "Kuh, kuh, cat!"\n\n🚗 Another example: **C**ar - "Kuh, kuh, car!"',
        },
      ],
      quiz: {
        questions: [
          {
            question: 'What sound does A make?',
            options: ['Buh', 'Ah', 'Kuh', 'Duh'],
            correctAnswer: 1,
            explanation: 'A makes the "ah" sound, like in Apple!',
            points: 10,
          },
          {
            question: 'Which word starts with B?',
            options: ['Cat', 'Apple', 'Ball', 'Dog'],
            correctAnswer: 2,
            explanation: 'Ball starts with B! "Buh, buh, ball!"',
            points: 10,
          },
          {
            question: '🐱 Cat starts with which letter?',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 2,
            explanation: 'Cat starts with C! "Kuh, kuh, cat!"',
            points: 10,
          },
        ],
        passingScore: 70,
      },
      learningObjectives: [
        'Identify the sounds of A, B, C',
        'Associate letters with beginning sounds',
        'Practice phonetic pronunciation',
      ],
    });
    readingCourse.lessons.push(readingLesson1._id as any);
    console.log(`   + ${readingLesson1.title}`);

    // Reading Lesson 2
    const readingLesson2 = await Lesson.create({
      courseId: readingCourse._id,
      title: 'Building Simple Words',
      description: 'Put letter sounds together to make words!',
      order: 2,
      estimatedDuration: 15,
      contentBlocks: [
        {
          type: 'text',
          content: '# Building Words 🧱\n\nNow that you know letter sounds, let\'s put them together to make words!\n\n**Remember:** Sound out each letter, then blend them together.',
        },
        {
          type: 'text',
          content: '## Word 1: CAT 🐱\n\nC + A + T = CAT\n\n"Kuh" + "ah" + "tuh" = "Cat"\n\nTry saying it slowly, then faster: c...a...t... CAT!',
        },
        {
          type: 'text',
          content: '## Word 2: BAT 🦇\n\nB + A + T = BAT\n\n"Buh" + "ah" + "tuh" = "Bat"\n\nNotice how it sounds like CAT but starts with B!',
        },
        {
          type: 'text',
          content: '## Word 3: SAT\n\nS + A + T = SAT\n\n"Sss" + "ah" + "tuh" = "Sat"\n\n📖 The cat **sat** on the mat!',
        },
      ],
      quiz: {
        questions: [
          {
            question: 'What does C-A-T spell?',
            options: ['Bat', 'Cat', 'Hat', 'Sat'],
            correctAnswer: 1,
            explanation: 'C-A-T spells CAT! Great reading!',
            points: 10,
          },
          {
            question: 'Which word rhymes with CAT?',
            options: ['Dog', 'Bat', 'Cup', 'Run'],
            correctAnswer: 1,
            explanation: 'BAT rhymes with CAT! They both end in -AT.',
            points: 10,
          },
          {
            question: 'Fill in: The cat ___ on the mat.',
            options: ['sat', 'run', 'big', 'is'],
            correctAnswer: 0,
            explanation: 'The cat SAT on the mat! S-A-T = sat.',
            points: 10,
          },
        ],
        passingScore: 70,
      },
      learningObjectives: [
        'Blend letter sounds into words',
        'Read simple three-letter words',
        'Recognize word families',
      ],
    });
    readingCourse.lessons.push(readingLesson2._id as any);
    console.log(`   + ${readingLesson2.title}`);

    await readingCourse.save();

    // ==================== COURSE 3: SCIENCE ====================
    console.log('\n🔬 Creating Science Explorers course...');
    const scienceCourse = await Course.create({
      title: 'Science Explorers: Nature & Animals',
      description: 'Discover the wonders of nature through structured, predictable lessons perfect for autism-friendly learning. Includes detailed visuals, calm narration, and hands-on experiments.',
      category: 'Science',
      difficulty: 'beginner',
      tags: ['science', 'nature', 'animals', 'autism-friendly', 'structured-learning'],
      thumbnail: 'https://images.unsplash.com/photo-1446329813274-7c9036bd9a1f?w=400',
      estimatedDuration: 200,
      instructor: educator._id,
      neurodiverseFeatures: {
        adhdFriendly: true,
        autismFriendly: true,
        dyslexiaFriendly: true,
        visualLearning: true,
        audioSupport: true,
        interactiveElements: true,
      },
      learningObjectives: [
        'Identify different animals and their habitats',
        'Understand basic life cycles',
        'Observe and describe nature',
        'Learn about weather and seasons',
      ],
      isPublished: true,
      lessons: [],
    });

    // Science Lesson 1
    const scienceLesson1 = await Lesson.create({
      courseId: scienceCourse._id,
      title: 'Meet the Animals',
      description: 'Learn about different animals and where they live!',
      order: 1,
      estimatedDuration: 12,
      contentBlocks: [
        {
          type: 'text',
          content: '# Welcome to Animal World! 🦁\n\nToday we will learn about animals and their homes.\n\n**What is a habitat?**\nA habitat is a place where an animal lives. It gives them food, water, and shelter.',
        },
        {
          type: 'text',
          content: '## Land Animals 🌳\n\n🦁 **Lions** live in grasslands called savannas\n🐘 **Elephants** live in forests and grasslands\n🐰 **Rabbits** live in meadows and make burrows underground\n🐻 **Bears** live in forests and mountains',
        },
        {
          type: 'image',
          content: 'https://images.unsplash.com/photo-1474511320723-9a56873571b7?w=600',
        },
        {
          type: 'text',
          content: '## Water Animals 🌊\n\n🐟 **Fish** live in rivers, lakes, and oceans\n🐬 **Dolphins** live in the ocean\n🐢 **Turtles** can live in water and on land\n🐙 **Octopus** live deep in the ocean',
        },
        {
          type: 'text',
          content: '## Sky Animals 🌤️\n\n🦅 **Eagles** fly high and live in mountains\n🦋 **Butterflies** visit gardens and meadows\n🦉 **Owls** live in trees and hunt at night',
        },
      ],
      quiz: {
        questions: [
          {
            question: 'Where do fish live?',
            options: ['In trees', 'In the water', 'In the sky', 'Underground'],
            correctAnswer: 1,
            explanation: 'Fish live in water - rivers, lakes, and oceans!',
            points: 10,
          },
          {
            question: 'Which animal can fly?',
            options: ['Fish', 'Lion', 'Eagle', 'Elephant'],
            correctAnswer: 2,
            explanation: 'Eagles can fly! They have wings and live in mountains.',
            points: 10,
          },
          {
            question: 'What is a habitat?',
            options: ['A type of food', 'An animal home', 'A color', 'A game'],
            correctAnswer: 1,
            explanation: 'A habitat is where an animal lives - its home!',
            points: 10,
          },
        ],
        passingScore: 70,
      },
      learningObjectives: [
        'Identify land, water, and sky animals',
        'Understand what a habitat is',
        'Match animals to their habitats',
      ],
    });
    scienceCourse.lessons.push(scienceLesson1._id as any);
    console.log(`   + ${scienceLesson1.title}`);

    await scienceCourse.save();

    // ==================== COURSE 4: EMOTIONAL INTELLIGENCE ====================
    console.log('\n💖 Creating Emotional Intelligence course...');
    const emotionCourse = await Course.create({
      title: 'Understanding Feelings',
      description: 'Learn to identify and manage emotions with visual cues, social stories, and calming techniques. Designed to support emotional regulation and social understanding.',
      category: 'Social-Emotional',
      difficulty: 'beginner',
      tags: ['emotions', 'social-skills', 'autism-friendly', 'calming', 'self-regulation'],
      thumbnail: 'https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=400',
      estimatedDuration: 120,
      instructor: educator._id,
      neurodiverseFeatures: {
        adhdFriendly: true,
        autismFriendly: true,
        dyslexiaFriendly: true,
        visualLearning: true,
        audioSupport: true,
        interactiveElements: true,
      },
      learningObjectives: [
        'Identify basic emotions',
        'Recognize emotions in others',
        'Learn calming strategies',
        'Express feelings appropriately',
      ],
      isPublished: true,
      lessons: [],
    });

    // Emotion Lesson 1
    const emotionLesson1 = await Lesson.create({
      courseId: emotionCourse._id,
      title: 'Naming Our Feelings',
      description: 'Learn to identify and name different emotions!',
      order: 1,
      estimatedDuration: 10,
      contentBlocks: [
        {
          type: 'text',
          content: '# How Do You Feel? 🎭\n\nEveryone has feelings! Feelings are also called emotions.\n\n**It\'s okay to feel any emotion.** Understanding your feelings helps you feel better.',
        },
        {
          type: 'text',
          content: '## Happy 😊\n\nWhen you feel **happy**, you might:\n- Smile\n- Laugh\n- Feel light inside\n- Want to play\n\nThings that make us happy: playing with friends, getting a hug, doing something fun!',
        },
        {
          type: 'text',
          content: '## Sad 😢\n\nWhen you feel **sad**, you might:\n- Cry\n- Feel tired\n- Want to be alone\n- Need a hug\n\n**It\'s okay to be sad.** Everyone feels sad sometimes. It will pass.',
        },
        {
          type: 'text',
          content: '## Angry 😠\n\nWhen you feel **angry**, you might:\n- Feel hot\n- Want to yell\n- Feel your heart beat fast\n\n**When angry, try:** Take 3 deep breaths. Count to 10. Walk away.',
        },
        {
          type: 'text',
          content: '## Scared 😨\n\nWhen you feel **scared**, you might:\n- Feel your heart race\n- Want to hide\n- Feel shaky\n\n**It\'s okay to be scared.** Find someone you trust to talk to.',
        },
      ],
      quiz: {
        questions: [
          {
            question: '😊 This face shows what feeling?',
            options: ['Sad', 'Angry', 'Happy', 'Scared'],
            correctAnswer: 2,
            explanation: 'This is a happy face! When we\'re happy, we smile.',
            points: 10,
          },
          {
            question: 'What can you do when angry?',
            options: ['Hit things', 'Take deep breaths', 'Yell loudly', 'Break toys'],
            correctAnswer: 1,
            explanation: 'Taking deep breaths helps calm down when we\'re angry!',
            points: 10,
          },
          {
            question: 'Is it okay to feel sad?',
            options: ['No, never', 'Yes, everyone feels sad sometimes', 'Only babies feel sad', 'Sad is bad'],
            correctAnswer: 1,
            explanation: 'Yes! Everyone feels sad sometimes. It\'s a normal feeling.',
            points: 10,
          },
        ],
        passingScore: 70,
      },
      learningObjectives: [
        'Name four basic emotions',
        'Recognize physical signs of emotions',
        'Know that all feelings are okay',
      ],
    });
    emotionCourse.lessons.push(emotionLesson1._id as any);
    console.log(`   + ${emotionLesson1.title}`);

    await emotionCourse.save();

    // ==================== COURSE 5: CREATIVE CODING ====================
    console.log('\n💻 Creating Creative Coding course...');
    const codingCourse = await Course.create({
      title: 'Creative Coding: Art with Code',
      description: 'Learn to code by creating colorful art and animations! Step-by-step visual instructions with lots of examples. Perfect for visual learners who want to express creativity through technology.',
      category: 'Technology',
      difficulty: 'beginner',
      tags: ['coding', 'art', 'creativity', 'visual-learning', 'adhd-friendly'],
      thumbnail: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400',
      estimatedDuration: 180,
      instructor: educator._id,
      neurodiverseFeatures: {
        adhdFriendly: true,
        autismFriendly: true,
        dyslexiaFriendly: true,
        visualLearning: true,
        audioSupport: true,
        interactiveElements: true,
      },
      learningObjectives: [
        'Understand what code is',
        'Draw shapes using code',
        'Add colors to creations',
        'Make simple animations',
      ],
      isPublished: true,
      lessons: [],
    });

    const codingLesson1 = await Lesson.create({
      courseId: codingCourse._id,
      title: 'What is Code?',
      description: 'Discover how code is like a recipe for computers!',
      order: 1,
      estimatedDuration: 10,
      contentBlocks: [
        {
          type: 'text',
          content: '# What is Code? 💻\n\nCode is like a **recipe** for computers!\n\nJust like a recipe tells you how to bake cookies step by step, code tells a computer what to do step by step.',
        },
        {
          type: 'text',
          content: '## Code is Everywhere!\n\n📱 **Your phone** uses code\n🎮 **Video games** are made with code\n🤖 **Robots** follow code\n🌐 **Websites** are built with code\n\nEverything digital uses code!',
        },
        {
          type: 'text',
          content: '## How Code Works\n\nImagine telling a robot to make a sandwich:\n\n1. Get two slices of bread\n2. Open the peanut butter jar\n3. Use a knife to spread peanut butter\n4. Put the slices together\n\nThat\'s just like code! **Clear, step-by-step instructions.**',
        },
        {
          type: 'text',
          content: '## Your First "Code"\n\nLet\'s write instructions for drawing a happy face:\n\n```\n1. Draw a big circle (the face)\n2. Draw two small circles (the eyes)\n3. Draw a curved line (the smile)\n```\n\n🎨 That\'s thinking like a coder!',
        },
      ],
      quiz: {
        questions: [
          {
            question: 'What is code like?',
            options: ['A recipe', 'A song', 'A color', 'A game'],
            correctAnswer: 0,
            explanation: 'Code is like a recipe - step-by-step instructions for computers!',
            points: 10,
          },
          {
            question: 'Which uses code?',
            options: ['A paper book', 'A wooden chair', 'A video game', 'A pencil'],
            correctAnswer: 2,
            explanation: 'Video games are made with code! So are apps and websites.',
            points: 10,
          },
        ],
        passingScore: 70,
      },
      learningObjectives: [
        'Understand code as step-by-step instructions',
        'Recognize where code is used',
      ],
    });
    codingCourse.lessons.push(codingLesson1._id as any);
    console.log(`   + ${codingLesson1.title}`);

    const codingLesson2 = await Lesson.create({
      courseId: codingCourse._id,
      title: 'Drawing Shapes',
      description: 'Learn to draw colorful shapes with code!',
      order: 2,
      estimatedDuration: 15,
      contentBlocks: [
        {
          type: 'text',
          content: '# Drawing with Code! 🎨\n\nNow let\'s learn how to draw shapes using code words!\n\nIn coding, we use special words to tell the computer what to draw.',
        },
        {
          type: 'text',
          content: '## Basic Shapes\n\n🔵 **circle()** - draws a circle\n🟥 **square()** - draws a square\n🔺 **triangle()** - draws a triangle\n⬭ **rectangle()** - draws a rectangle',
        },
        {
          type: 'text',
          content: '## Telling the Computer WHERE\n\nWe also need to tell the computer:\n- **Where** to draw (position)\n- **How big** to make it (size)\n\nExample: `circle(100, 100, 50)`\n- 100 = how far from the left\n- 100 = how far from the top\n- 50 = how big (radius)',
        },
        {
          type: 'text',
          content: '## Adding Colors! 🌈\n\nWe can add colors before drawing:\n\n`fill(\"red\")`\n`circle(100, 100, 50)`\n\nThis makes a **red circle**!\n\nTry these colors: red, blue, green, yellow, purple, orange, pink',
        },
      ],
      quiz: {
        questions: [
          {
            question: 'What code draws a circle?',
            options: ['square()', 'circle()', 'triangle()', 'color()'],
            correctAnswer: 1,
            explanation: 'circle() is the code word for drawing circles!',
            points: 10,
          },
          {
            question: 'What does fill() do?',
            options: ['Draws a shape', 'Adds color', 'Erases everything', 'Makes sound'],
            correctAnswer: 1,
            explanation: 'fill() adds color to the shapes you draw!',
            points: 10,
          },
        ],
        passingScore: 70,
      },
      learningObjectives: [
        'Know shape code words',
        'Understand position and size',
        'Add colors to shapes',
      ],
    });
    codingCourse.lessons.push(codingLesson2._id as any);
    console.log(`   + ${codingLesson2.title}`);

    await codingCourse.save();

    // ==================== COURSE 6: LIFE SKILLS ====================
    console.log('\n🌟 Creating Life Skills course...');
    const lifeSkillsCourse = await Course.create({
      title: 'Daily Life Skills',
      description: 'Learn practical skills for everyday life with visual guides and social stories. Covers routines, self-care, and organization in a structured, predictable format.',
      category: 'Life Skills',
      difficulty: 'beginner',
      tags: ['life-skills', 'self-care', 'routines', 'autism-friendly', 'visual-guides'],
      thumbnail: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=400',
      estimatedDuration: 150,
      instructor: educator._id,
      neurodiverseFeatures: {
        adhdFriendly: true,
        autismFriendly: true,
        dyslexiaFriendly: true,
        visualLearning: true,
        audioSupport: true,
        interactiveElements: true,
      },
      learningObjectives: [
        'Follow a morning routine',
        'Practice self-care habits',
        'Organize belongings',
        'Plan simple tasks',
      ],
      isPublished: true,
      lessons: [],
    });

    const lifeLesson1 = await Lesson.create({
      courseId: lifeSkillsCourse._id,
      title: 'Morning Routine',
      description: 'Create a calm and organized morning routine!',
      order: 1,
      estimatedDuration: 12,
      contentBlocks: [
        {
          type: 'text',
          content: '# Good Morning! ☀️\n\nA morning routine helps us start the day feeling calm and ready.\n\n**Why routines help:**\n- We know what comes next\n- Less things to decide\n- Feels calming and safe',
        },
        {
          type: 'text',
          content: '## Step-by-Step Morning Routine\n\n**Step 1: Wake Up** ⏰\n- Hear the alarm\n- Stretch your body\n- Sit up slowly\n\n**Step 2: Bathroom** 🚿\n- Use the toilet\n- Wash your face\n- Brush your teeth (2 minutes!)',
        },
        {
          type: 'text',
          content: '**Step 3: Get Dressed** 👕\n- Pick clothes (or use ones laid out last night)\n- Put on underwear first\n- Then shirt, then pants\n- Don\'t forget socks!\n\n**Step 4: Breakfast** 🥣\n- Sit at the table\n- Eat your breakfast\n- Drink some water',
        },
        {
          type: 'text',
          content: '## Tips for Success 💪\n\n✅ **Prepare the night before** - lay out clothes, pack your bag\n✅ **Use a visual checklist** - pictures of each step\n✅ **Set timers** - know how long each step takes\n✅ **Same order every day** - predictability feels good!',
        },
      ],
      quiz: {
        questions: [
          {
            question: 'Why are routines helpful?',
            options: ['They are boring', 'We know what comes next', 'They take longer', 'They are hard'],
            correctAnswer: 1,
            explanation: 'Routines help because we know what comes next, which feels calming!',
            points: 10,
          },
          {
            question: 'What should you do the night before?',
            options: ['Watch TV all night', 'Prepare clothes and bag', 'Skip dinner', 'Stay up late'],
            correctAnswer: 1,
            explanation: 'Preparing clothes and your bag the night before makes mornings easier!',
            points: 10,
          },
        ],
        passingScore: 70,
      },
      learningObjectives: [
        'Follow morning routine steps',
        'Understand why routines help',
        'Prepare the night before',
      ],
    });
    lifeSkillsCourse.lessons.push(lifeLesson1._id as any);
    console.log(`   + ${lifeLesson1.title}`);

    await lifeSkillsCourse.save();

    // ==================== SUMMARY ====================
    console.log('\n✅ Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log('   - 1 Educator account');
    console.log('   - 6 Courses:');
    console.log('     • Math Adventures (2 lessons)');
    console.log('     • Reading Champions (2 lessons)');
    console.log('     • Science Explorers (1 lesson)');
    console.log('     • Understanding Feelings (1 lesson)');
    console.log('     • Creative Coding (2 lessons)');
    console.log('     • Daily Life Skills (1 lesson)');
    console.log('   - 9 Total Lessons with quizzes');
    console.log('\n🔐 Educator Login:');
    console.log('   Email: educator@neurolearn.com');
    console.log('   Password: Educator123!');
    console.log('\n🚀 You can now:');
    console.log('   1. Register as a new student');
    console.log('   2. Browse and enroll in courses');
    console.log('   3. Take lessons and quizzes');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
}

seedDatabase();
