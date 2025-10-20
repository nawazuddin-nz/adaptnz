import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, Session } from '@supabase/supabase-js';
import { ArrowLeft, Bot, Loader2, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ChatMessage {
  role: 'bot' | 'user';
  content: string;
}

const Onboarding = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'bot',
      content: "Hi! I'm your AI learning assistant. I'll help you create a personalized learning roadmap. What would you like to learn? (e.g., Web Development, Python, Data Science)"
    }
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('');
  const [preference, setPreference] = useState('');
  const [skillLevel, setSkillLevel] = useState('');
  const [goal, setGoal] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (!session?.user) {
          navigate('/auth');
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSendMessage = () => {
    if (!currentInput.trim()) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: currentInput
    };

    setMessages(prev => [...prev, userMessage]);
    
    if (step === 0) {
      // First question - what to learn
      setTopic(currentInput);
      setMessages(prev => [...prev, {
        role: 'bot',
        content: "Great choice! How much time do you have available for this learning journey?"
      }]);
      setStep(1);
    } else if (step === 1) {
      // Second question - duration
      setDuration(currentInput);
      setMessages(prev => [...prev, {
        role: 'bot',
        content: "What's your preferred learning style?"
      }]);
      setStep(2);
    }
    
    setCurrentInput('');
  };

  const handleDurationSelect = (selectedDuration: string) => {
    setDuration(selectedDuration);
    setMessages(prev => [...prev, 
      { role: 'user', content: selectedDuration },
      { role: 'bot', content: "What's your preferred learning style?" }
    ]);
    setStep(2);
  };

  const handlePreferenceSelect = (selectedPreference: string) => {
    setPreference(selectedPreference);
    setMessages(prev => [...prev, 
      { role: 'user', content: selectedPreference },
      { role: 'bot', content: "What's your current skill level?" }
    ]);
    setStep(3);
  };

  const handleSkillLevelSelect = (selectedSkillLevel: string) => {
    setSkillLevel(selectedSkillLevel);
    setMessages(prev => [...prev, 
      { role: 'user', content: selectedSkillLevel },
      { role: 'bot', content: "What's your main learning goal?" }
    ]);
    setStep(4);
  };

  const handleGoalSelect = (selectedGoal: string) => {
    setGoal(selectedGoal);
    setMessages(prev => [...prev, 
      { role: 'user', content: selectedGoal },
      { role: 'bot', content: "Perfect! I'm now generating your personalized learning roadmap. This might take a moment..." }
    ]);
    
    generateRoadmap(topic, duration, selectedGoal, skillLevel, preference);
  };

  const generateRoadmap = async (learningTopic: string, learningDuration: string, learningGoal: string, learningSkillLevel: string, learningPreference: string) => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-roadmap', {
        body: {
          topic: learningTopic,
          duration: learningDuration,
          goal: learningGoal,
          skillLevel: learningSkillLevel,
          preference: learningPreference,
          userId: user?.id
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Success!",
          description: "Your learning roadmap has been created!",
        });
        
        const milestoneCount = learningDuration === '1 week' ? 3 : learningDuration === '2 weeks' ? 4 : 5;
        setMessages(prev => [...prev, {
          role: 'bot',
          content: `🎉 Your "${learningTopic}" roadmap is ready! I've created ${milestoneCount} milestones for your ${learningDuration} journey. You can now start learning!`
        }]);
        
        // Navigate to the course after a short delay
        setTimeout(() => {
          navigate(`/course/${data.course.id}`);
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error generating roadmap:', error);
      toast({
        title: "Error",
        description: "Failed to generate roadmap. Please try again.",
        variant: "destructive",
      });
      
      setMessages(prev => [...prev, {
        role: 'bot',
        content: "I'm sorry, there was an error generating your roadmap. Please try again or go back to start over."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

return (
  <div className="min-h-screen bg-gray-50">
    {/* Header */}
    <header className="border-b border-gray-200 bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Create Your Learning Path</h1>
        <p className="text-gray-600">
          Let's build a personalized roadmap for you
        </p>
      </div>
    </header>

    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card className="flex flex-col min-h-[500px] bg-white border border-gray-200 rounded-xl shadow-md transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Bot className="w-5 h-5 text-blue-600" />
            AI Learning Assistant
          </CardTitle>
          <CardDescription className="text-gray-600">
            I'll ask you a few questions to create your perfect personalized learning roadmap
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col max-h-[70vh]">
          {/* Messages */}
          <div id="chat-container" className="flex-1 space-y-4 overflow-y-auto mb-4 pr-2">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-3 rounded-lg flex items-center gap-2 text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  Generating your roadmap...
                </div>
              </div>
            )}
          </div>

          {/* Quick Select Options */}
          {step === 1 && !isLoading && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">Quick select:</p>
              <div className="flex gap-2 flex-wrap">
                {['1 week', '2 weeks', '4 weeks'].map((dur) => (
                  <Badge
                    key={dur}
                    variant="outline"
                    className="cursor-pointer border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                    onClick={() => handleDurationSelect(dur)}
                  >
                    {dur}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {step === 2 && !isLoading && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">Select your preference:</p>
              <div className="flex gap-2 flex-wrap">
                {['Videos', 'Notes', 'Interactive'].map((pref) => (
                  <Badge
                    key={pref}
                    variant="outline"
                    className="cursor-pointer border-blue-500 text-blue-500 hover:bg-blue-600 hover:text-white transition-colors"
                    onClick={() => handlePreferenceSelect(pref)}
                  >
                    {pref}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {step === 3 && !isLoading && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">Select your skill level:</p>
              <div className="flex gap-2 flex-wrap">
                {['Beginner', 'Intermediate', 'Advanced'].map((level) => (
                  <Badge
                    key={level}
                    variant="outline"
                    className="cursor-pointer border-green-500 text-green-500 hover:bg-green-600 hover:text-white transition-colors"
                    onClick={() => handleSkillLevelSelect(level)}
                  >
                    {level}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {step === 4 && !isLoading && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">Select your goal:</p>
              <div className="flex gap-2 flex-wrap">
                {['Exam', 'Project', 'Placement', 'Other'].map((goalOption) => (
                  <Badge
                    key={goalOption}
                    variant="outline"
                    className="cursor-pointer border-purple-500 text-purple-500 hover:bg-purple-600 hover:text-white transition-colors"
                    onClick={() => handleGoalSelect(goalOption)}
                  >
                    {goalOption}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {!isLoading && step < 2 && (
            <div className="flex gap-2">
              <Input
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                placeholder={step === 0 ? "e.g., React Development" : "e.g., 2 weeks"}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={isLoading}
                className="bg-white border border-gray-300 text-gray-900 placeholder-gray-400"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!currentInput.trim() || isLoading}
                className="bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  </div>
);

};

export default Onboarding;
