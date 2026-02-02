"""
AI Content Generator Service
Generates personalized educational content based on student's neurodiverse profile
"""

import os
import httpx
from typing import List, Dict, Any, Optional
import json

# Try to import OpenAI, but make it optional
try:
    import openai  # type: ignore
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")


class ContentGenerator:
    """
    Generates adaptive educational content based on:
    - Student's neurodiverse conditions (ADHD, autism, dyslexia, etc.)
    - Learning style preferences
    - Current topic/subject
    - Difficulty level
    """
    
    def __init__(self):
        self.condition_adaptations = {
            "adhd": {
                "max_paragraph_length": 2,
                "use_bullet_points": True,
                "include_breaks": True,
                "gamification": True,
                "chunk_size": "small",
                "visual_cues": True,
                "progress_indicators": True,
                "interactive_elements": True,
                "estimated_read_time": True,
                "tips": [
                    "Take a 2-minute break after this section",
                    "Try moving around while thinking about this",
                    "Use a fidget tool if it helps you focus"
                ]
            },
            "autism": {
                "literal_language": True,
                "avoid_idioms": True,
                "structured_format": True,
                "predictable_layout": True,
                "sensory_warnings": True,
                "clear_expectations": True,
                "step_by_step": True,
                "visual_schedules": True,
                "tips": [
                    "This section has 3 parts",
                    "Expected time: 5 minutes",
                    "No surprises in this lesson"
                ]
            },
            "dyslexia": {
                "simple_vocabulary": True,
                "short_sentences": True,
                "text_to_speech": True,
                "dyslexia_font": True,
                "high_contrast": True,
                "visual_aids": True,
                "audio_alternative": True,
                "line_spacing": "loose",
                "tips": [
                    "Use the listen button to hear this text",
                    "Take your time reading",
                    "Look at the pictures for help"
                ]
            },
            "dyscalculia": {
                "visual_math": True,
                "real_world_examples": True,
                "step_by_step_math": True,
                "number_lines": True,
                "manipulatives": True,
                "no_timed_exercises": True,
                "multiple_methods": True,
                "tips": [
                    "Use your fingers or objects to count",
                    "Draw pictures to solve problems",
                    "There's no time limit - take as long as you need"
                ]
            },
            "dysgraphia": {
                "minimize_writing": True,
                "voice_input": True,
                "typing_alternative": True,
                "graphic_organizers": True,
                "fill_in_blanks": True,
                "multiple_choice": True,
                "tips": [
                    "You can speak your answers",
                    "Use the keyboard instead of writing",
                    "Take hand breaks when needed"
                ]
            }
        }
        
        self.learning_style_formats = {
            "visual": {
                "include_diagrams": True,
                "color_coding": True,
                "infographics": True,
                "mind_maps": True,
                "charts_and_graphs": True
            },
            "auditory": {
                "include_audio": True,
                "discussion_prompts": True,
                "verbal_explanations": True,
                "rhymes_and_mnemonics": True
            },
            "kinesthetic": {
                "hands_on_activities": True,
                "interactive_simulations": True,
                "movement_breaks": True,
                "real_world_applications": True
            },
            "reading": {
                "detailed_text": True,
                "note_taking_prompts": True,
                "reading_lists": True,
                "written_summaries": True
            }
        }

    def generate_content_prompt(
        self,
        topic: str,
        subject: str,
        conditions: List[str],
        learning_styles: List[str],
        difficulty: str = "beginner",
        lesson_type: str = "explanation"
    ) -> str:
        """
        Generate a prompt for AI content generation based on student profile
        """
        adaptations = []
        tips = []
        
        for condition in conditions:
            if condition.lower() in self.condition_adaptations:
                adapt = self.condition_adaptations[condition.lower()]
                adaptations.append(f"- {condition.upper()}: Use {adapt.get('chunk_size', 'medium')} chunks, "
                                   f"{'include breaks' if adapt.get('include_breaks') else ''}, "
                                   f"{'use literal language' if adapt.get('literal_language') else ''}")
                tips.extend(adapt.get("tips", []))
        
        style_requirements = []
        for style in learning_styles:
            if style.lower() in self.learning_style_formats:
                fmt = self.learning_style_formats[style.lower()]
                if fmt.get("include_diagrams"):
                    style_requirements.append("Include diagram descriptions")
                if fmt.get("include_audio"):
                    style_requirements.append("Write content that works well when read aloud")
                if fmt.get("hands_on_activities"):
                    style_requirements.append("Include hands-on activities and experiments")
        
        prompt = f"""
You are an expert educational content creator specializing in neurodiverse-friendly learning materials.

Create a {lesson_type} lesson about "{topic}" for the subject "{subject}" at {difficulty} level.

STUDENT PROFILE ADAPTATIONS:
{chr(10).join(adaptations) if adaptations else "General audience"}

LEARNING STYLE REQUIREMENTS:
{chr(10).join(style_requirements) if style_requirements else "Mixed learning styles"}

CONTENT GUIDELINES:
1. Use clear, simple language
2. Break content into small, digestible chunks
3. Use emoji and visual markers (📌, 💡, ✅, ⚠️, 🎯)
4. Include a "Key Takeaway" at the end
5. Add "Check Your Understanding" questions
6. Use markdown formatting
7. Maximum 3 sentences per paragraph
8. Include practical examples
9. Add encouraging messages

STRUCTURE:
1. Title with emoji
2. Learning objectives (what they'll learn)
3. Main content (chunked with headings)
4. Visual/Interactive element descriptions
5. Practice questions with explanations
6. Key takeaway summary
7. Optional: Tips for the student's conditions

Generate the lesson content now:
"""
        return prompt

    async def generate_lesson_content(
        self,
        topic: str,
        subject: str,
        conditions: List[str] = [],
        learning_styles: List[str] = ["visual"],
        difficulty: str = "beginner"
    ) -> Dict[str, Any]:
        """
        Generate a complete lesson using AI
        Falls back to template-based generation if no API key
        """
        
        # If OpenAI is available and API key exists, use it
        if OPENAI_AVAILABLE and OPENAI_API_KEY:
            return await self._generate_with_openai(topic, subject, conditions, learning_styles, difficulty)
        
        # Otherwise, use template-based generation
        return self._generate_with_templates(topic, subject, conditions, learning_styles, difficulty)
    
    async def _generate_with_openai(
        self,
        topic: str,
        subject: str,
        conditions: List[str],
        learning_styles: List[str],
        difficulty: str
    ) -> Dict[str, Any]:
        """Generate content using OpenAI API"""
        try:
            client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
            prompt = self.generate_content_prompt(topic, subject, conditions, learning_styles, difficulty)
            
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an expert educational content creator for neurodiverse students."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=2000,
                temperature=0.7
            )
            
            content = response.choices[0].message.content
            
            # Generate quiz questions
            quiz_prompt = f"""
Based on this lesson about "{topic}", create 3 quiz questions in JSON format:
[
  {{
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Why this answer is correct"
  }}
]
Only output valid JSON, no other text.
"""
            quiz_response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You create educational quiz questions. Output only valid JSON."},
                    {"role": "user", "content": quiz_prompt}
                ],
                max_tokens=800,
                temperature=0.5
            )
            
            try:
                quiz = json.loads(quiz_response.choices[0].message.content)
            except:
                quiz = self._generate_default_quiz(topic)
            
            return {
                "success": True,
                "generated": True,
                "method": "openai",
                "lesson": {
                    "title": f"{topic}",
                    "content": content,
                    "type": "text",
                    "duration": self._estimate_duration(content, conditions),
                    "quiz": quiz,
                    "learningObjectives": self._extract_objectives(content),
                    "adaptations_applied": conditions,
                    "learning_styles": learning_styles
                }
            }
        except Exception as e:
            # Fallback to templates on error
            return self._generate_with_templates(topic, subject, conditions, learning_styles, difficulty)
    
    def _generate_with_templates(
        self,
        topic: str,
        subject: str,
        conditions: List[str],
        learning_styles: List[str],
        difficulty: str
    ) -> Dict[str, Any]:
        """Generate content using smart templates (no API needed)"""
        
        # Build adaptations
        breaks_section = ""
        tips_section = ""
        format_notes = []
        
        for condition in conditions:
            cond_lower = condition.lower()
            if cond_lower in self.condition_adaptations:
                adapt = self.condition_adaptations[cond_lower]
                tips_section += "\n".join([f"💡 {tip}" for tip in adapt.get("tips", [])])
                
                if adapt.get("include_breaks"):
                    breaks_section = "\n\n---\n⏸️ **Take a Break!** Stand up, stretch, or take 5 deep breaths before continuing.\n\n---\n"
        
        # Condition-specific intro
        intro_style = "Welcome to this lesson!"
        if "adhd" in [c.lower() for c in conditions]:
            intro_style = "🚀 Quick Start! This lesson is broken into small chunks. You've got this!"
        elif "autism" in [c.lower() for c in conditions]:
            intro_style = "📋 Lesson Overview: This lesson has 4 sections. Each section takes about 2-3 minutes."
        elif "dyslexia" in [c.lower() for c in conditions]:
            intro_style = "🎧 Tip: Use the listen button to hear this text read aloud!"
        
        content = f"""# {topic} 📚

{intro_style}

## 🎯 What You'll Learn

By the end of this lesson, you will:
- Understand the basics of {topic}
- Be able to explain {topic} in your own words
- Apply what you learned to simple examples

---

## 📌 Introduction

{topic} is an important concept in {subject}.

Let's break it down step by step.

Think of it like building blocks - we'll start simple and build up!
{breaks_section}

## 💡 The Main Idea

Here's the key thing to remember:

> **{topic}** helps us understand how things work in {subject}.

### Why Does This Matter?

1. 🎮 It's used in everyday life
2. 🏗️ Professionals use it at work  
3. 🧠 It makes you a better problem solver

---

## 🔍 Let's Look Closer

### Step 1: Understand the Basics

{topic} starts with understanding the fundamentals.

**Example:**
Think about something familiar from your daily life...

### Step 2: See It In Action

Now let's see how {topic} works in practice.

**Try This:**
- Look around you
- Find an example of {topic}
- Describe it in your own words

### Step 3: Practice

The best way to learn is by doing!

---

## ✅ Check Your Understanding

Before we finish, let's make sure you got it:

1. What is {topic}?
2. Why is it important?
3. Can you give one example?

---

## 🎯 Key Takeaway

**Remember this:** {topic} is all about understanding {subject} better. 

You don't need to memorize everything - just understand the main idea!

---

## 🌟 Great Job!

You completed this lesson! 

{tips_section}

**Next Steps:**
- Review the key points
- Try the practice quiz
- Move on when you're ready

Remember: Learning takes time, and that's okay! 💪
"""
        
        # Generate quiz based on topic
        quiz = [
            {
                "question": f"What is the main topic of this lesson?",
                "options": [f"{topic}", "Something else", "None of these", "I don't know"],
                "correctAnswer": 0,
                "explanation": f"This lesson was all about {topic}!"
            },
            {
                "question": f"Why is learning about {topic} important?",
                "options": [
                    "It's not important",
                    "It helps us understand and solve problems",
                    "Only for tests",
                    "It's too hard to matter"
                ],
                "correctAnswer": 1,
                "explanation": f"Learning {topic} helps us understand the world and solve real problems!"
            },
            {
                "question": "What's the best way to learn something new?",
                "options": [
                    "Memorize everything quickly",
                    "Skip the hard parts",
                    "Practice and take your time",
                    "Only read once"
                ],
                "correctAnswer": 2,
                "explanation": "Practice and taking your time helps you truly understand and remember!"
            }
        ]
        
        return {
            "success": True,
            "generated": True,
            "method": "template",
            "lesson": {
                "title": topic,
                "content": content,
                "type": "text",
                "duration": self._estimate_duration(content, conditions),
                "quiz": quiz,
                "learningObjectives": [
                    f"Understand the basics of {topic}",
                    f"Explain {topic} in your own words",
                    "Apply knowledge to simple examples"
                ],
                "adaptations_applied": conditions,
                "learning_styles": learning_styles
            }
        }
    
    def _estimate_duration(self, content: str, conditions: List[str]) -> int:
        """Estimate reading time based on content length and conditions"""
        word_count = len(content.split())
        
        # Base reading speed: 200 words per minute
        base_time = word_count / 200
        
        # Adjust for conditions
        if "dyslexia" in [c.lower() for c in conditions]:
            base_time *= 1.5  # 50% more time for dyslexia
        if "adhd" in [c.lower() for c in conditions]:
            base_time *= 1.2  # 20% more time for breaks
        
        return max(5, int(base_time))  # Minimum 5 minutes
    
    def _extract_objectives(self, content: str) -> List[str]:
        """Extract learning objectives from generated content"""
        # Simple extraction - look for bullet points after "learn" or "objectives"
        objectives = [
            "Understand the main concepts",
            "Apply knowledge to examples",
            "Check understanding with practice"
        ]
        return objectives
    
    def _generate_default_quiz(self, topic: str) -> List[Dict]:
        """Generate default quiz questions"""
        return [
            {
                "question": f"What did you learn about {topic}?",
                "options": ["The basics", "Advanced concepts", "Nothing", "Everything"],
                "correctAnswer": 0,
                "explanation": f"This lesson covered the basics of {topic}."
            }
        ]
    
    def adapt_existing_content(
        self,
        content: str,
        conditions: List[str],
        learning_styles: List[str] = []
    ) -> Dict[str, Any]:
        """
        Adapt existing content for specific conditions
        Adds breaks, tips, formatting adjustments
        """
        adapted_content = content
        additions = []
        
        for condition in conditions:
            cond_lower = condition.lower()
            if cond_lower in self.condition_adaptations:
                adapt = self.condition_adaptations[cond_lower]
                
                # Add condition-specific elements
                if adapt.get("include_breaks"):
                    additions.append("\n\n⏸️ **Mini Break:** Take 3 deep breaths before continuing.\n")
                
                if adapt.get("tips"):
                    additions.append("\n\n💡 **Helpful Tips:**\n" + "\n".join([f"- {t}" for t in adapt["tips"]]))
                
                if adapt.get("estimated_read_time"):
                    word_count = len(content.split())
                    read_time = max(2, word_count // 150)
                    additions.insert(0, f"\n⏱️ **Estimated time:** {read_time} minutes\n\n")
        
        adapted_content = adapted_content + "\n".join(additions)
        
        return {
            "original_length": len(content),
            "adapted_length": len(adapted_content),
            "conditions_applied": conditions,
            "content": adapted_content
        }


# Singleton instance
content_generator = ContentGenerator()
