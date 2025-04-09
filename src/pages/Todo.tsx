import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Todo } from "@/types/todo";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const TodoPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [todo, setTodo] = useState<Todo | null>(null);
  const [suggestions, setSuggestions] = useState<string>("");
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>();

  useEffect(() => {
    if (id) {
      fetchTodo();
    }
  }, [id]);

  const fetchTodo = async () => {
    try {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setTodo(data);
      if (data.due_date) {
        setSelectedDate(new Date(data.due_date));
      }
    } catch (error) {
      console.error('Error fetching todo:', error);
      toast({
        title: "Error",
        description: "Failed to fetch todo details",
        variant: "destructive",
      });
    }
  };

  const updateTodo = async () => {
    if (!todo) return;

    try {
      const { error } = await supabase
        .from('todos')
        .update({
          title: todo.title,
          description: todo.description,
          due_date: selectedDate?.toISOString(),
        })
        .eq('id', todo.id);

      if (error) throw error;

      if (selectedDate) {
        await createCalendarEvent();
      }

      toast({
        title: "Success",
        description: "Todo updated successfully",
      });

      // Navigate back to the chatbot page after successful update
      navigate('/');
    } catch (error) {
      console.error('Error updating todo:', error);
      toast({
        title: "Error",
        description: "Failed to update todo",
        variant: "destructive",
      });
    }
  };

  const createCalendarEvent = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-calendar-event', {
        body: {
          title: todo?.title,
          description: todo?.description,
          startTime: selectedDate?.toISOString(),
        },
      });

      if (error) throw error;

      if (data.eventId) {
        await supabase
          .from('todos')
          .update({ calendar_event_id: data.eventId })
          .eq('id', todo?.id);
      }
    } catch (error) {
      console.error('Error creating calendar event:', error);
      toast({
        title: "Warning",
        description: "Failed to create calendar event",
        variant: "destructive",
      });
    }
  };

  const getGeminiSuggestions = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('chat-with-gemini', {
        body: { 
          prompt: `Please suggest efficient ways to tackle this task: ${todo?.title}. ${todo?.description ? `Additional context: ${todo?.description}` : ''}`
        },
      });

      if (error) throw error;

      setSuggestions(data.response);
      
      // Save suggestions to the todo
      await supabase
        .from('todos')
        .update({ gemini_suggestions: data.response })
        .eq('id', todo?.id);

    } catch (error) {
      console.error('Error getting suggestions:', error);
      toast({
        title: "Error",
        description: "Failed to get AI suggestions",
        variant: "destructive",
      });
    }
  };

  if (!todo) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate('/')}
          className="mr-4"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Back to todos</span>
        </Button>
        <h1 className="text-2xl font-bold">Todo Details</h1>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <Input
            value={todo.title}
            onChange={(e) => setTodo({ ...todo, title: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <Textarea
            value={todo.description || ""}
            onChange={(e) => setTodo({ ...todo, description: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Due Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex gap-4">
          <Button onClick={updateTodo}>Save Changes</Button>
          <Button variant="outline" onClick={getGeminiSuggestions}>
            Get AI Suggestions
          </Button>
        </div>

        {suggestions && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-2">AI Suggestions</h2>
            <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap">
              {suggestions}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TodoPage;