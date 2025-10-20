import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { completedCourse, userPreferences } = await req.json();
    console.log('Suggesting next course for:', { completedCourse, userPreferences });

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `
      Based on the completed course "${completedCourse}", provide structured suggestions in the following JSON format:
      
      {
        "currentOpportunities": {
          "title": "What You Can Do Now",
          "items": ["Career opportunity 1", "Project idea 1", "Skill application 1"]
        },
        "nextSteps": {
          "title": "Recommended Next Steps",
          "items": [
            {
              "name": "Course/Skill Name",
              "description": "Why this is impactful",
              "impact": "Career impact description"
            }
          ]
        },
        "careerPaths": {
          "title": "Career Opportunities",
          "items": ["Career path 1", "Career path 2", "Career path 3"]
        }
      }
      
      Provide exactly 3 items for currentOpportunities and careerPaths, and 2-3 items for nextSteps.
      Make suggestions specific, actionable, and motivational. Return ONLY valid JSON.
    `;

    const response = await fetch(`${GEMINI_API_URL}?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Gemini API response received');

    const suggestionText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    try {
      const suggestions = JSON.parse(suggestionText);
      return new Response(JSON.stringify({
        success: true,
        suggestions: suggestions
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Failed to parse suggestions JSON:', parseError);
      return new Response(JSON.stringify({
        success: true,
        suggestions: {
          currentOpportunities: {
            title: "What You Can Do Now",
            items: ["Apply your new skills in real projects", "Build a portfolio showcasing your knowledge", "Network with professionals in your field"]
          },
          nextSteps: {
            title: "Recommended Next Steps",
            items: [
              {
                name: "Advanced Topics",
                description: "Deepen your expertise with advanced concepts",
                impact: "Stand out as an expert in your field"
              }
            ]
          },
          careerPaths: {
            title: "Career Opportunities",
            items: ["Freelance opportunities", "Full-time positions", "Consulting roles"]
          }
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in suggest-next-course function:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});