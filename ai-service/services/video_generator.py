"""
AI Video Generator Service
Generates educational videos using AI services (D-ID, Synthesia, or text-to-speech with slides)
"""

import os
import httpx
import json
import asyncio
import base64
from typing import List, Dict, Any, Optional
from datetime import datetime
import hashlib

# Try to import optional dependencies
try:
    from gtts import gTTS  # type: ignore
    GTTS_AVAILABLE = True
except ImportError:
    GTTS_AVAILABLE = False

# Try to import video creation dependencies
try:
    from moviepy import ImageClip, AudioFileClip, concatenate_videoclips, CompositeVideoClip, TextClip
    from PIL import Image, ImageDraw, ImageFont
    MOVIEPY_AVAILABLE = True
except ImportError:
    MOVIEPY_AVAILABLE = False

# API Keys from environment
DID_API_KEY = os.getenv("DID_API_KEY", "")
HEYGEN_API_KEY = os.getenv("HEYGEN_API_KEY", "")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")

# Output directory for generated content
OUTPUT_DIR = os.getenv("VIDEO_OUTPUT_DIR", "./generated_videos")


class VideoGenerator:
    """
    Generates educational videos using various AI services:
    1. D-ID - Creates talking avatar videos
    2. HeyGen - Alternative avatar video service  
    3. ElevenLabs + Images - High quality TTS with slide images
    4. gTTS (fallback) - Free text-to-speech
    """
    
    def __init__(self):
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        
        # Avatar options for D-ID (using real D-ID Clips presenter IDs)
        self.avatars = {
            "friendly_teacher": {
                "presenter_id": "v2_public_lana_black_suite_classroom@kOgpJoXaCn",  # Female teacher
                "voice_id": "en-US-JennyNeural",
                "style": "friendly"
            },
            "professional": {
                "presenter_id": "v2_public_joseph_grey_suite_coffeeshop@7fiPyaDUIq",  # Professional male
                "voice_id": "en-US-GuyNeural", 
                "style": "professional"
            },
            "young_tutor": {
                "presenter_id": "v2_public_lily@addf3c9auh",  # Young female tutor
                "voice_id": "en-US-AriaNeural",
                "style": "casual"
            }
        }
        
        # Condition-specific video adaptations
        self.condition_adaptations = {
            "adhd": {
                "max_segment_duration": 60,  # seconds
                "include_visual_cues": True,
                "speaking_pace": "moderate",
                "include_progress_bar": True,
                "add_chapter_markers": True,
                "background_style": "minimal"  # Less distracting
            },
            "autism": {
                "speaking_pace": "slow",
                "literal_narration": True,
                "predictable_transitions": True,
                "show_agenda": True,
                "consistent_presenter": True,
                "avoid_sudden_changes": True
            },
            "dyslexia": {
                "include_captions": True,
                "highlight_keywords": True,
                "dyslexia_friendly_font": True,
                "speaking_pace": "slow",
                "visual_word_display": True
            },
            "dyscalculia": {
                "step_by_step_visuals": True,
                "number_animations": True,
                "real_world_visualizations": True,
                "pause_for_processing": True
            }
        }

    async def generate_video_script(
        self,
        topic: str,
        subject: str,
        conditions: List[str] = [],
        learning_styles: List[str] = [],
        duration_minutes: int = 5,
        difficulty: str = "beginner"
    ) -> Dict[str, Any]:
        """
        Generate a video script optimized for neurodiverse learners
        """
        # Calculate segments based on conditions
        max_segment_duration = 90  # Default
        for condition in conditions:
            if condition.lower() in self.condition_adaptations:
                adapt = self.condition_adaptations[condition.lower()]
                max_segment_duration = min(max_segment_duration, 
                                          adapt.get("max_segment_duration", 90))
        
        num_segments = max(1, (duration_minutes * 60) // max_segment_duration)
        
        # Generate script structure
        script = {
            "title": f"Learn {topic}",
            "subject": subject,
            "total_duration": duration_minutes * 60,
            "difficulty": difficulty,
            "segments": [],
            "adaptations_applied": [],
            "metadata": {
                "created_at": datetime.utcnow().isoformat(),
                "conditions": conditions,
                "learning_styles": learning_styles
            }
        }
        
        # Apply condition adaptations
        for condition in conditions:
            if condition.lower() in self.condition_adaptations:
                script["adaptations_applied"].append({
                    "condition": condition,
                    "adaptations": self.condition_adaptations[condition.lower()]
                })
        
        # Create segments with smart content structure
        segment_templates = self._get_segment_templates(topic, subject, difficulty)
        
        for i, template in enumerate(segment_templates[:num_segments]):
            segment = {
                "id": i + 1,
                "title": template["title"],
                "duration": max_segment_duration,
                "narration": template["narration"],
                "visual_description": template["visual"],
                "key_points": template["key_points"],
                "transition": template.get("transition", "fade"),
                "interactive_pause": i > 0 and i % 2 == 0  # Pause every 2 segments
            }
            
            # Add ADHD-specific elements
            if "adhd" in [c.lower() for c in conditions]:
                segment["progress_indicator"] = f"{i+1}/{len(segment_templates)}"
                segment["encouragement"] = self._get_encouragement(i)
            
            # Add captions for dyslexia
            if "dyslexia" in [c.lower() for c in conditions]:
                segment["display_text"] = template["key_points"]
                segment["highlight_words"] = self._get_keywords(template["narration"])
            
            script["segments"].append(segment)
        
        # Add intro and outro
        script["intro"] = {
            "duration": 10,
            "narration": f"Welcome! Today we're going to learn about {topic}. "
                        f"This video is about {duration_minutes} minutes long. "
                        f"Feel free to pause anytime you need a break!",
            "show_outline": True
        }
        
        script["outro"] = {
            "duration": 15,
            "narration": f"Great job completing this lesson on {topic}! "
                        f"Remember, it's okay to watch this again if you need to. "
                        f"You're doing amazing!",
            "show_summary": True,
            "next_steps": True
        }
        
        return script

    def _get_segment_templates(self, topic: str, subject: str, difficulty: str) -> List[Dict]:
        """Generate smart segment templates based on topic"""
        
        # Subject-specific templates
        templates = {
            "math": [
                {
                    "title": "What is it?",
                    "narration": f"Let's start by understanding what {topic} really means. "
                                f"Think of it like a puzzle piece that helps us solve problems.",
                    "visual": "Animated introduction with friendly graphics",
                    "key_points": [f"Definition of {topic}", "Why it matters"]
                },
                {
                    "title": "See it in action",
                    "narration": f"Now let's see {topic} in a real example. "
                                f"Watch carefully as I show you step by step.",
                    "visual": "Step-by-step animated example with highlighted numbers",
                    "key_points": ["Step 1: Setup", "Step 2: Solve", "Step 3: Check"]
                },
                {
                    "title": "Try it yourself",
                    "narration": "Your turn! Pause the video and try this practice problem. "
                                "Take your time - there's no rush.",
                    "visual": "Practice problem with space for thinking",
                    "key_points": ["Practice problem", "Hint available"]
                },
                {
                    "title": "Common mistakes",
                    "narration": f"Let's look at common mistakes people make with {topic}, "
                                f"so you can avoid them!",
                    "visual": "Side-by-side comparison of right vs wrong",
                    "key_points": ["Mistake to avoid", "Correct approach"]
                },
                {
                    "title": "Quick recap",
                    "narration": f"Let's quickly review what we learned about {topic}.",
                    "visual": "Visual summary with key points",
                    "key_points": ["Main concept", "Key formula", "When to use it"]
                }
            ],
            "reading": [
                {
                    "title": "Getting started",
                    "narration": f"Today we'll explore {topic}. Let's begin with the basics.",
                    "visual": "Calm, welcoming intro with topic title",
                    "key_points": [f"Introduction to {topic}"]
                },
                {
                    "title": "Key concepts",
                    "narration": f"Here are the main ideas you need to know about {topic}.",
                    "visual": "Visual concept map",
                    "key_points": ["Main idea 1", "Main idea 2", "Main idea 3"]
                },
                {
                    "title": "Examples",
                    "narration": "Let's look at some examples to make this clearer.",
                    "visual": "Examples with text highlighting",
                    "key_points": ["Example 1", "Example 2"]
                },
                {
                    "title": "Practice",
                    "narration": "Now it's your turn to practice. You've got this!",
                    "visual": "Interactive practice slide",
                    "key_points": ["Practice activity"]
                }
            ],
            "science": [
                {
                    "title": "Wonder and discover",
                    "narration": f"Have you ever wondered about {topic}? Let's explore!",
                    "visual": "Engaging question with visuals",
                    "key_points": [f"Question about {topic}"]
                },
                {
                    "title": "The explanation",
                    "narration": f"Here's how {topic} works in simple terms.",
                    "visual": "Animated diagram showing the concept",
                    "key_points": ["How it works", "Key principle"]
                },
                {
                    "title": "Real world connection",
                    "narration": f"You can see {topic} in action all around you!",
                    "visual": "Real-world examples and photos",
                    "key_points": ["Example 1", "Example 2"]
                },
                {
                    "title": "Experiment time",
                    "narration": "Here's a simple experiment you can try at home!",
                    "visual": "Step-by-step experiment guide",
                    "key_points": ["Materials", "Steps", "What to observe"]
                }
            ]
        }
        
        # Return templates for subject or default
        return templates.get(subject.lower(), templates["reading"])

    def _get_encouragement(self, segment_index: int) -> str:
        """Get encouraging messages for ADHD learners"""
        encouragements = [
            "You're doing great! Keep going! 🌟",
            "Awesome focus! Almost there! 💪",
            "Great job staying with it! 🎯",
            "You've got this! 🚀",
            "Fantastic progress! 🏆"
        ]
        return encouragements[segment_index % len(encouragements)]

    def _get_keywords(self, text: str) -> List[str]:
        """Extract keywords for highlighting (for dyslexia support)"""
        # Simple keyword extraction - in production, use NLP
        stop_words = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 
                     'been', 'being', 'have', 'has', 'had', 'do', 'does',
                     'did', 'will', 'would', 'could', 'should', 'may',
                     'might', 'must', 'shall', 'can', 'need', 'to', 'of',
                     'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
                     'into', 'through', 'during', 'before', 'after', 'and',
                     'but', 'or', 'nor', 'so', 'yet', 'this', 'that', 'these',
                     'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
                     "let's", "let", "us", "about", "like", "really"}
        
        words = text.lower().replace('.', '').replace(',', '').replace('!', '').split()
        keywords = [w for w in words if w not in stop_words and len(w) > 3]
        
        # Return unique keywords, max 5
        seen = set()
        unique_keywords = []
        for w in keywords:
            if w not in seen:
                seen.add(w)
                unique_keywords.append(w)
        
        return unique_keywords[:5]

    async def generate_video_with_did(
        self,
        script: Dict[str, Any],
        avatar: str = "friendly_teacher"
    ) -> Dict[str, Any]:
        """
        Generate video using D-ID API - creates AI talking avatar videos.
        
        To use this feature:
        1. Sign up at https://www.d-id.com/
        2. Get your API key from dashboard
        3. Set DID_API_KEY environment variable (base64 encoded: base64(email:password))
        """
        if not DID_API_KEY:
            return {
                "success": False,
                "error": "D-ID API key not configured. Set DID_API_KEY environment variable. Get your key at https://www.d-id.com/",
                "fallback": "audio_slides"
            }
        
        avatar_config = self.avatars.get(avatar, self.avatars["friendly_teacher"])
        
        # Combine all narrations
        full_script = script.get("intro", {}).get("narration", "") + " "
        for segment in script.get("segments", []):
            full_script += segment.get("narration", "") + " "
        full_script += script.get("outro", {}).get("narration", "")
        
        # Limit script length for D-ID (they have limits)
        if len(full_script) > 5000:
            full_script = full_script[:5000] + "..."
        
        try:
            async with httpx.AsyncClient(timeout=180.0) as client:
                # Create clip using D-ID Clips API with presenter_id
                response = await client.post(
                    "https://api.d-id.com/clips",
                    headers={
                        "Authorization": f"Basic {DID_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "presenter_id": avatar_config["presenter_id"],
                        "script": {
                            "type": "text",
                            "input": full_script,
                            "provider": {
                                "type": "microsoft",
                                "voice_id": avatar_config["voice_id"]
                            }
                        },
                        "config": {
                            "result_format": "mp4"
                        }
                    }
                )
                
                if response.status_code == 201:
                    result = response.json()
                    talk_id = result.get("id")
                    
                    # Poll for completion
                    video_url = await self._poll_did_status(client, talk_id)
                    
                    if video_url:
                        # Download the video locally
                        local_path = await self._download_did_video(client, video_url, script.get("title", "avatar_video"))
                        
                        return {
                            "success": True,
                            "video_url": video_url,
                            "video_path": local_path,
                            "talk_id": talk_id,
                            "title": script.get("title", ""),
                            "duration_estimate": len(full_script) / 15,  # ~15 chars per second
                            "provider": "d-id",
                            "avatar": avatar
                        }
                else:
                    error_detail = response.text
                    try:
                        error_json = response.json()
                        error_detail = error_json.get("message", error_detail)
                    except:
                        pass
                    
                return {
                    "success": False,
                    "error": f"D-ID API error ({response.status_code}): {error_detail}",
                    "fallback": "audio_slides"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "fallback": "audio_slides"
            }

    async def _download_did_video(self, client: httpx.AsyncClient, video_url: str, title: str) -> str:
        """Download D-ID video to local storage"""
        try:
            response = await client.get(video_url)
            if response.status_code == 200:
                safe_title = "".join(c if c.isalnum() else "_" for c in title)[:50]
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"avatar_{safe_title}_{timestamp}.mp4"
                filepath = os.path.join(OUTPUT_DIR, filename)
                
                with open(filepath, "wb") as f:
                    f.write(response.content)
                
                return filepath
        except Exception as e:
            print(f"Failed to download D-ID video: {e}")
        return ""

    async def _poll_did_status(self, client: httpx.AsyncClient, clip_id: str, max_attempts: int = 30) -> Optional[str]:
        """Poll D-ID Clips API for video completion"""
        for _ in range(max_attempts):
            await asyncio.sleep(2)
            
            response = await client.get(
                f"https://api.d-id.com/clips/{clip_id}",
                headers={"Authorization": f"Basic {DID_API_KEY}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                status = data.get("status")
                
                if status == "done":
                    return data.get("result_url")
                elif status == "error":
                    return None
        
        return None

    async def generate_audio_narration(
        self,
        text: str,
        voice: str = "default",
        output_filename: str = None
    ) -> Dict[str, Any]:
        """
        Generate audio narration using ElevenLabs or gTTS (fallback)
        """
        if output_filename is None:
            # Create unique filename
            text_hash = hashlib.md5(text.encode()).hexdigest()[:8]
            output_filename = f"narration_{text_hash}.mp3"
        
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        
        # Try ElevenLabs first (higher quality)
        if ELEVENLABS_API_KEY:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
                        headers={
                            "xi-api-key": ELEVENLABS_API_KEY,
                            "Content-Type": "application/json"
                        },
                        json={
                            "text": text,
                            "model_id": "eleven_monolingual_v1",
                            "voice_settings": {
                                "stability": 0.5,
                                "similarity_boost": 0.75
                            }
                        }
                    )
                    
                    if response.status_code == 200:
                        with open(output_path, "wb") as f:
                            f.write(response.content)
                        
                        return {
                            "success": True,
                            "audio_path": output_path,
                            "provider": "elevenlabs"
                        }
            except Exception as e:
                pass  # Fall through to gTTS
        
        # Fallback to gTTS (free)
        if GTTS_AVAILABLE:
            try:
                tts = gTTS(text=text, lang='en', slow=False)
                tts.save(output_path)
                
                return {
                    "success": True,
                    "audio_path": output_path,
                    "provider": "gtts"
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": f"gTTS error: {str(e)}"
                }
        
        return {
            "success": False,
            "error": "No TTS service available. Install gTTS: pip install gtts"
        }

    async def generate_video_with_slides(
        self,
        script: Dict[str, Any],
        include_audio: bool = True
    ) -> Dict[str, Any]:
        """
        Generate a slide-based video with audio narration
        This is the fallback when AI video generation isn't available
        Returns slide data that frontend can render as an animated presentation
        """
        slides = []
        
        # Intro slide
        intro = script.get("intro", {})
        slides.append({
            "id": 0,
            "type": "intro",
            "title": script["title"],
            "subtitle": f"A {script.get('difficulty', 'beginner')} lesson",
            "narration": intro.get("narration", ""),
            "duration": intro.get("duration", 10),
            "animation": "fade_in",
            "background": "gradient_blue"
        })
        
        # Content slides
        for segment in script.get("segments", []):
            slide = {
                "id": segment["id"],
                "type": "content",
                "title": segment["title"],
                "narration": segment["narration"],
                "visual_description": segment.get("visual_description", ""),
                "key_points": segment.get("key_points", []),
                "duration": segment.get("duration", 60),
                "animation": segment.get("transition", "slide_left"),
                "interactive_pause": segment.get("interactive_pause", False)
            }
            
            # Add ADHD adaptations
            if "progress_indicator" in segment:
                slide["progress"] = segment["progress_indicator"]
                slide["encouragement"] = segment.get("encouragement", "")
            
            # Add dyslexia adaptations
            if "highlight_words" in segment:
                slide["highlight_words"] = segment["highlight_words"]
                slide["display_text"] = segment.get("display_text", [])
            
            slides.append(slide)
        
        # Outro slide
        outro = script.get("outro", {})
        slides.append({
            "id": len(slides),
            "type": "outro",
            "title": "Great Job! 🎉",
            "narration": outro.get("narration", ""),
            "duration": outro.get("duration", 15),
            "animation": "fade_in",
            "background": "gradient_green",
            "show_summary": outro.get("show_summary", True)
        })
        
        # Generate audio for each slide if requested
        audio_files = []
        if include_audio:
            for slide in slides:
                if slide.get("narration"):
                    audio_result = await self.generate_audio_narration(
                        slide["narration"],
                        output_filename=f"slide_{slide['id']}.mp3"
                    )
                    if audio_result.get("success"):
                        slide["audio_file"] = audio_result["audio_path"]
                        audio_files.append(audio_result["audio_path"])
        
        return {
            "success": True,
            "type": "slide_presentation",
            "title": script["title"],
            "total_slides": len(slides),
            "total_duration": sum(s.get("duration", 30) for s in slides),
            "slides": slides,
            "audio_files": audio_files,
            "adaptations": script.get("adaptations_applied", []),
            "script": script
        }

    async def generate_educational_video(
        self,
        topic: str,
        subject: str,
        conditions: List[str] = [],
        learning_styles: List[str] = [],
        duration_minutes: int = 5,
        difficulty: str = "beginner",
        prefer_avatar: bool = True
    ) -> Dict[str, Any]:
        """
        Main entry point for video generation
        Tries AI avatar first, falls back to slides with audio
        """
        # Generate the script
        script = await self.generate_video_script(
            topic=topic,
            subject=subject,
            conditions=conditions,
            learning_styles=learning_styles,
            duration_minutes=duration_minutes,
            difficulty=difficulty
        )
        
        # Try D-ID avatar video if preferred and available
        if prefer_avatar and DID_API_KEY:
            result = await self.generate_video_with_did(script)
            if result.get("success"):
                return result
        
        # Fallback to slide presentation with audio
        return await self.generate_video_with_slides(script, include_audio=True)

    def _create_slide_image(
        self,
        slide: Dict[str, Any],
        width: int = 1920,
        height: int = 1080
    ) -> str:
        """
        Create a slide image using Pillow
        """
        if not MOVIEPY_AVAILABLE:
            return ""
        
        # Color schemes based on slide type
        color_schemes = {
            "intro": {"bg": (59, 130, 246), "text": (255, 255, 255), "accent": (147, 197, 253)},
            "content": {"bg": (249, 250, 251), "text": (17, 24, 39), "accent": (59, 130, 246)},
            "outro": {"bg": (34, 197, 94), "text": (255, 255, 255), "accent": (187, 247, 208)},
        }
        
        slide_type = slide.get("type", "content")
        colors = color_schemes.get(slide_type, color_schemes["content"])
        
        # Create image
        img = Image.new('RGB', (width, height), colors["bg"])
        draw = ImageDraw.Draw(img)
        
        # Try to load a font, fallback to default
        try:
            title_font = ImageFont.truetype("arial.ttf", 72)
            body_font = ImageFont.truetype("arial.ttf", 42)
            small_font = ImageFont.truetype("arial.ttf", 32)
        except:
            title_font = ImageFont.load_default()
            body_font = ImageFont.load_default()
            small_font = ImageFont.load_default()
        
        # Draw title
        title = slide.get("title", "")
        if title:
            # Center the title
            bbox = draw.textbbox((0, 0), title, font=title_font)
            text_width = bbox[2] - bbox[0]
            x = (width - text_width) // 2
            y = 100 if slide_type == "intro" else 80
            draw.text((x, y), title, fill=colors["text"], font=title_font)
        
        # Draw subtitle for intro
        if slide_type == "intro" and slide.get("subtitle"):
            subtitle = slide["subtitle"]
            bbox = draw.textbbox((0, 0), subtitle, font=body_font)
            text_width = bbox[2] - bbox[0]
            x = (width - text_width) // 2
            draw.text((x, 200), subtitle, fill=colors["accent"], font=body_font)
        
        # Draw key points
        key_points = slide.get("key_points", [])
        if key_points:
            y_start = 280
            for i, point in enumerate(key_points[:5]):
                bullet = f"• {point}"
                draw.text((150, y_start + i * 80), bullet, fill=colors["text"], font=body_font)
        
        # Draw visual description box
        visual_desc = slide.get("visual_description", "")
        if visual_desc and slide_type == "content":
            # Draw a placeholder box for visual content
            box_x, box_y = width - 700, 250
            box_w, box_h = 550, 400
            draw.rectangle([box_x, box_y, box_x + box_w, box_y + box_h], 
                          outline=colors["accent"], width=3)
            # Wrap and draw the description
            words = visual_desc.split()
            lines = []
            current_line = ""
            for word in words:
                test_line = current_line + " " + word if current_line else word
                bbox = draw.textbbox((0, 0), test_line, font=small_font)
                if bbox[2] - bbox[0] < box_w - 40:
                    current_line = test_line
                else:
                    if current_line:
                        lines.append(current_line)
                    current_line = word
            if current_line:
                lines.append(current_line)
            
            for i, line in enumerate(lines[:6]):
                draw.text((box_x + 20, box_y + 30 + i * 50), line, 
                         fill=colors["text"], font=small_font)
        
        # Draw progress indicator for ADHD adaptation
        progress = slide.get("progress", "")
        if progress:
            draw.text((width - 200, height - 80), progress, 
                     fill=colors["accent"], font=body_font)
        
        # Draw encouragement
        encouragement = slide.get("encouragement", "")
        if encouragement:
            bbox = draw.textbbox((0, 0), encouragement, font=small_font)
            text_width = bbox[2] - bbox[0]
            x = (width - text_width) // 2
            draw.text((x, height - 150), encouragement, 
                     fill=colors["accent"], font=small_font)
        
        # Save the image
        img_path = os.path.join(OUTPUT_DIR, f"slide_{slide.get('id', 0)}.png")
        img.save(img_path)
        return img_path

    async def create_full_video(
        self,
        topic: str,
        subject: str,
        conditions: List[str] = [],
        learning_styles: List[str] = [],
        duration_minutes: int = 5,
        difficulty: str = "beginner",
        output_filename: str = None
    ) -> Dict[str, Any]:
        """
        Create a complete MP4 video file with slides and audio narration.
        Combines generated slide images with TTS audio into a single video.
        """
        if not MOVIEPY_AVAILABLE:
            return {
                "success": False,
                "error": "moviepy and pillow are required. Install with: pip install moviepy pillow"
            }
        
        # First generate the slide presentation with audio
        result = await self.generate_educational_video(
            topic=topic,
            subject=subject,
            conditions=conditions,
            learning_styles=learning_styles,
            duration_minutes=duration_minutes,
            difficulty=difficulty,
            prefer_avatar=False  # Use slides for this
        )
        
        if not result.get("success"):
            return result
        
        slides = result.get("slides", [])
        if not slides:
            return {"success": False, "error": "No slides generated"}
        
        # Generate output filename
        if not output_filename:
            safe_topic = "".join(c if c.isalnum() else "_" for c in topic)[:50]
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_filename = f"{safe_topic}_{timestamp}.mp4"
        
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        
        # Run video creation in thread to avoid blocking
        loop = asyncio.get_event_loop()
        try:
            video_result = await loop.run_in_executor(
                None,
                self._create_video_sync,
                slides,
                output_path
            )
            
            if video_result.get("success"):
                video_result["total_slides"] = len(slides)
                video_result["adaptations"] = result.get("adaptations", [])
                video_result["video_filename"] = output_filename
            
            return video_result
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to create video: {str(e)}"
            }

    def _create_video_sync(
        self,
        slides: List[Dict[str, Any]],
        output_path: str
    ) -> Dict[str, Any]:
        """
        Synchronous video creation using moviepy.
        Called from thread executor to avoid blocking async loop.
        """
        video_clips = []
        
        try:
            for slide in slides:
                # Create slide image
                img_path = self._create_slide_image(slide)
                if not img_path or not os.path.exists(img_path):
                    print(f"Skipping slide {slide.get('id')}: no image")
                    continue
                
                # Get audio file and duration
                audio_path = slide.get("audio_file", "")
                duration = slide.get("duration", 10)
                
                # Create image clip
                img_clip = ImageClip(img_path)
                
                # If audio exists, use its duration
                if audio_path and os.path.exists(audio_path):
                    try:
                        audio_clip = AudioFileClip(audio_path)
                        duration = audio_clip.duration + 0.5  # Add buffer
                        img_clip = img_clip.with_duration(duration)
                        img_clip = img_clip.with_audio(audio_clip)
                    except Exception as e:
                        print(f"Error adding audio for slide {slide.get('id')}: {e}")
                        img_clip = img_clip.with_duration(duration)
                else:
                    img_clip = img_clip.with_duration(duration)
                
                video_clips.append(img_clip)
            
            if not video_clips:
                return {"success": False, "error": "No video clips created"}
            
            # Concatenate all clips
            print(f"Concatenating {len(video_clips)} clips...")
            final_video = concatenate_videoclips(video_clips, method="compose")
            
            # Write the video file
            print(f"Writing video to {output_path}...")
            final_video.write_videofile(
                output_path,
                fps=24,
                codec="libx264",
                audio_codec="aac"
            )
            
            total_duration = sum(c.duration for c in video_clips)
            
            # Close clips to free resources
            final_video.close()
            for clip in video_clips:
                clip.close()
            
            file_size = os.path.getsize(output_path) if os.path.exists(output_path) else 0
            
            return {
                "success": True,
                "video_path": output_path,
                "total_duration": round(total_duration, 1),
                "file_size_mb": round(file_size / (1024 * 1024), 2),
                "message": f"Video created successfully!"
            }
        except Exception as e:
            # Clean up on error
            for clip in video_clips:
                try:
                    clip.close()
                except:
                    pass
            return {
                "success": False,
                "error": f"Video creation failed: {str(e)}"
            }


# Singleton instance
video_generator = VideoGenerator()
