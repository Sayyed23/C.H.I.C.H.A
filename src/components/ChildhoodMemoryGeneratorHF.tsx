
import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Loader2, Download, RefreshCw, Image as ImageIcon, AlertTriangle } from "lucide-react";
import { Separator } from "./ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card, CardContent } from "./ui/card";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

interface ChildhoodMemoryForm {
  description: string;
  style: string;
  era: string;
  mood: string;
  gender: string;
  age: string;
  location: string;
  season: string;
  timeOfDay: string;
  weather: string;
  activity: string;
  companions: string;
  specialObject: string;
}

export const ChildhoodMemoryGeneratorHF = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [promptUsed, setPromptUsed] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [currentTab, setCurrentTab] = useState("basic");
  const [error, setError] = useState<{ message: string; type: string } | null>(null);
  const [lastGenerationAttempt, setLastGenerationAttempt] = useState<number>(0);

  const form = useForm<ChildhoodMemoryForm>({
    defaultValues: {
      description: "",
      style: "Default",
      era: "Not specified",
      mood: "Nostalgic",
      gender: "Not specified",
      age: "Not specified",
      location: "Not specified",
      season: "Not specified",
      timeOfDay: "Not specified",
      weather: "Not specified",
      activity: "Not specified",
      companions: "Not specified",
      specialObject: "Not specified",
    },
  });

  const watchedValues = form.watch();

  // Function to generate image based on current form values
  const handleGenerateImage = async (values: ChildhoodMemoryForm) => {
    if (!values.description.trim()) {
      toast({
        title: "Memory description required",
        description: "Please describe your childhood memory",
        variant: "destructive",
      });
      setSubmitAttempted(true);
      return;
    }

    // Set current timestamp to prevent duplicate generations
    const currentTime = Date.now();
    setLastGenerationAttempt(currentTime);
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("generate-childhood-image-hf", {
        body: {
          prompt: values.description,
          style: values.style,
          era: values.era,
          mood: values.mood,
          gender: values.gender,
          age: values.age,
          location: values.location,
          season: values.season,
          timeOfDay: values.timeOfDay,
          weather: values.weather,
          activity: values.activity,
          companions: values.companions,
          specialObject: values.specialObject,
        },
      });

      if (error) throw error;

      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
        setPromptUsed(data.prompt);
        toast({
          title: "Memory visualized!",
          description: "Your childhood memory has been created",
        });
      } else if (data.error) {
        handleApiError(data);
      }
    } catch (error: any) {
      console.error("Image generation error:", error);
      
      // Check if the response contains structured error data
      if (error.message && error.message.includes("Edge Function returned a non-2xx status code")) {
        setError({
          message: "The image generation service is currently unavailable. Please try again later.",
          type: "SERVER_ERROR"
        });
      } else {
        setError({
          message: "Failed to generate image. Please try again later.",
          type: "UNKNOWN_ERROR"
        });
      }
      
      toast({
        title: "Generation Error",
        description: "Failed to generate image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApiError = (data: any) => {
    console.log("API returned error:", data);
    
    if (data.errorType === "CREDIT_LIMIT") {
      setError({
        message: "The image generation service has reached its usage limit. Please try again tomorrow.",
        type: "CREDIT_LIMIT"
      });
      toast({
        title: "API Limit Reached",
        description: "The image generation service has reached its usage limit. Please try again tomorrow.",
        variant: "destructive",
      });
    } else {
      setError({
        message: data.details || data.error || "An unknown error occurred",
        type: data.errorType || "API_ERROR"
      });
      toast({
        title: "Generation Error",
        description: data.details || "Failed to generate image. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Effect for auto-generation when values change
  useEffect(() => {
    if (!autoGenerate || isGenerating || !watchedValues.description.trim()) return;
    
    // Use debounce to prevent too many API calls
    const currentValues = {...watchedValues};
    const currentTime = Date.now();
    
    const timer = setTimeout(() => {
      // Only proceed if we haven't already made a more recent generation attempt
      if (currentTime > lastGenerationAttempt) {
        handleGenerateImage(currentValues);
      }
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [
    watchedValues.description,
    watchedValues.style, 
    watchedValues.era,
    watchedValues.mood,
    watchedValues.gender,
    ...(currentTab === "advanced" ? [
      watchedValues.age,
      watchedValues.location,
      watchedValues.season,
      watchedValues.timeOfDay,
      watchedValues.weather,
      watchedValues.activity,
      watchedValues.companions,
      watchedValues.specialObject,
    ] : [])
  ]);

  const handleDownload = () => {
    if (!generatedImage) return;

    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `childhood-memory-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exampleMemories = [
    "Playing with sparklers on a warm summer night, surrounded by family in the backyard. The sky was dark blue and filled with stars.",
    "Building a sandcastle at the beach when I was 7, with my red bucket and blue shovel. The waves were gentle and the sun was setting.",
    "Sitting by the fireplace during Christmas morning, unwrapping presents in pajamas while snow fell outside the window.",
    "Climbing the old oak tree in my grandparents' garden, hiding in the branches and watching the world below.",
    "Riding my bicycle with training wheels for the first time down our neighborhood street, feeling so proud.",
  ];

  const setExampleMemory = (example: string) => {
    form.setValue("description", example);
  };

  const resetForm = () => {
    form.reset();
    setGeneratedImage(null);
    setPromptUsed(null);
    setSubmitAttempted(false);
    setError(null);
  };

  const ageOptions = ["Not specified", "5", "6", "7", "8", "9", "10", "11", "12"];

  return (
    <div className="flex flex-col space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card className="md:col-span-2 overflow-hidden">
          <Tabs 
            defaultValue="basic" 
            className="w-full"
            onValueChange={(value) => setCurrentTab(value)}
          >
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="basic">Basic Settings</TabsTrigger>
              <TabsTrigger value="advanced">Advanced Settings</TabsTrigger>
            </TabsList>
            
            <ScrollArea className="h-[calc(100vh-240px)] p-1">
              <Form {...form}>
                <form className="space-y-4 p-4">
                  <TabsContent value="basic" className="space-y-4 mt-0 px-0">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Memory Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe your childhood memory in detail..."
                              className="min-h-[120px] resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Be specific about colors, feelings, and details
                          </FormDescription>
                          {submitAttempted && !field.value && (
                            <p className="text-sm text-destructive mt-1">
                              Please provide a description
                            </p>
                          )}
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Example Memories</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {exampleMemories.map((example, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            className="h-auto py-2 px-3 text-left justify-start font-normal text-xs"
                            onClick={() => setExampleMemory(example)}
                            type="button"
                          >
                            {example.length > 80 ? example.substring(0, 80) + "..." : example}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="style"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Art Style</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select style" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Default">Default</SelectItem>
                                <SelectItem value="Watercolor">Watercolor</SelectItem>
                                <SelectItem value="Oil painting">Oil Painting</SelectItem>
                                <SelectItem value="Photography">Photography</SelectItem>
                                <SelectItem value="Anime">Anime</SelectItem>
                                <SelectItem value="Pixar">Pixar</SelectItem>
                                <SelectItem value="Vintage film">Vintage Film</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="mood"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mood</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select mood" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Default">Default</SelectItem>
                                <SelectItem value="Warm">Warm</SelectItem>
                                <SelectItem value="Nostalgic">Nostalgic</SelectItem>
                                <SelectItem value="Playful">Playful</SelectItem>
                                <SelectItem value="Serene">Serene</SelectItem>
                                <SelectItem value="Exciting">Exciting</SelectItem>
                                <SelectItem value="Magical">Magical</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="era"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Era/Decade</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select era" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Not specified">Not specified</SelectItem>
                                <SelectItem value="1970s">1970s</SelectItem>
                                <SelectItem value="1980s">1980s</SelectItem>
                                <SelectItem value="1990s">1990s</SelectItem>
                                <SelectItem value="2000s">2000s</SelectItem>
                                <SelectItem value="2010s">2010s</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gender</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Not specified">Not specified</SelectItem>
                                <SelectItem value="Boy">Boy</SelectItem>
                                <SelectItem value="Girl">Girl</SelectItem>
                                <SelectItem value="Non-binary">Non-binary</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="advanced" className="space-y-4 mt-0 px-0">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="age"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Age</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select age" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {ageOptions.map((age) => (
                                  <SelectItem key={age} value={age}>
                                    {age}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select location" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Not specified">Not specified</SelectItem>
                                <SelectItem value="Home">Home</SelectItem>
                                <SelectItem value="School">School</SelectItem>
                                <SelectItem value="Beach">Beach</SelectItem>
                                <SelectItem value="Park">Park</SelectItem>
                                <SelectItem value="Forest">Forest</SelectItem>
                                <SelectItem value="Grandparents' house">Grandparents' house</SelectItem>
                                <SelectItem value="Backyard">Backyard</SelectItem>
                                <SelectItem value="Playground">Playground</SelectItem>
                                <SelectItem value="Swimming pool">Swimming pool</SelectItem>
                                <SelectItem value="Campsite">Campsite</SelectItem>
                                <SelectItem value="Farm">Farm</SelectItem>
                                <SelectItem value="Mountains">Mountains</SelectItem>
                                <SelectItem value="Lake">Lake</SelectItem>
                                <SelectItem value="Birthday party">Birthday party</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="season"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Season</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select season" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Not specified">Not specified</SelectItem>
                                <SelectItem value="Summer">Summer</SelectItem>
                                <SelectItem value="Fall/Autumn">Fall/Autumn</SelectItem>
                                <SelectItem value="Winter">Winter</SelectItem>
                                <SelectItem value="Spring">Spring</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="timeOfDay"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Time of Day</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select time" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Not specified">Not specified</SelectItem>
                                <SelectItem value="Morning">Morning</SelectItem>
                                <SelectItem value="Afternoon">Afternoon</SelectItem>
                                <SelectItem value="Evening">Evening</SelectItem>
                                <SelectItem value="Night">Night</SelectItem>
                                <SelectItem value="Sunrise">Sunrise</SelectItem>
                                <SelectItem value="Sunset">Sunset</SelectItem>
                                <SelectItem value="Golden hour">Golden Hour</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="weather"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Weather</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select weather" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Not specified">Not specified</SelectItem>
                                <SelectItem value="Sunny">Sunny</SelectItem>
                                <SelectItem value="Cloudy">Cloudy</SelectItem>
                                <SelectItem value="Rainy">Rainy</SelectItem>
                                <SelectItem value="Snowy">Snowy</SelectItem>
                                <SelectItem value="Foggy">Foggy</SelectItem>
                                <SelectItem value="Stormy">Stormy</SelectItem>
                                <SelectItem value="Windy">Windy</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="activity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Activity</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select activity" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Not specified">Not specified</SelectItem>
                                <SelectItem value="Playing">Playing</SelectItem>
                                <SelectItem value="Reading">Reading</SelectItem>
                                <SelectItem value="Swimming">Swimming</SelectItem>
                                <SelectItem value="Biking">Biking</SelectItem>
                                <SelectItem value="Running">Running</SelectItem>
                                <SelectItem value="Drawing">Drawing</SelectItem>
                                <SelectItem value="Building">Building</SelectItem>
                                <SelectItem value="Celebrating">Celebrating</SelectItem>
                                <SelectItem value="Exploring">Exploring</SelectItem>
                                <SelectItem value="Dancing">Dancing</SelectItem>
                                <SelectItem value="Playing sports">Playing sports</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="companions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Companions</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select companions" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Not specified">Not specified</SelectItem>
                                <SelectItem value="Family">Family</SelectItem>
                                <SelectItem value="Friends">Friends</SelectItem>
                                <SelectItem value="Parents">Parents</SelectItem>
                                <SelectItem value="Siblings">Siblings</SelectItem>
                                <SelectItem value="Grandparents">Grandparents</SelectItem>
                                <SelectItem value="Pet">Pet</SelectItem>
                                <SelectItem value="Best friend">Best friend</SelectItem>
                                <SelectItem value="Alone">Alone</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="specialObject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Special Object</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select object" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Not specified">Not specified</SelectItem>
                                <SelectItem value="Teddy bear">Teddy bear</SelectItem>
                                <SelectItem value="Bicycle">Bicycle</SelectItem>
                                <SelectItem value="Doll">Doll</SelectItem>
                                <SelectItem value="Action figure">Action figure</SelectItem>
                                <SelectItem value="Ball">Ball</SelectItem>
                                <SelectItem value="Book">Book</SelectItem>
                                <SelectItem value="Blanket fort">Blanket fort</SelectItem>
                                <SelectItem value="Tree house">Tree house</SelectItem>
                                <SelectItem value="Board game">Board game</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  {error && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Image Generation Error</AlertTitle>
                      <AlertDescription>
                        {error.type === "CREDIT_LIMIT" ? (
                          <>
                            The AI service has reached its usage limit. Please try again later. 
                            <br />
                            <span className="text-xs opacity-80 mt-1 block">
                              This is a demo feature with limited API calls.
                            </span>
                          </>
                        ) : (
                          error.message
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex flex-col gap-2 pt-2">
                    <div className="flex justify-between items-center">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoGenerate}
                          onChange={() => setAutoGenerate(!autoGenerate)}
                          className="rounded text-primary"
                        />
                        Auto-generate on change
                      </label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={resetForm}
                        disabled={isGenerating}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>

                    <Button
                      type="button"
                      className="w-full"
                      disabled={isGenerating || !watchedValues.description.trim()}
                      onClick={form.handleSubmit(handleGenerateImage)}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <ImageIcon className="mr-2 h-4 w-4" />
                          Generate Memory
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </ScrollArea>
          </Tabs>
        </Card>

        <Card className="md:col-span-3 flex flex-col h-full">
          <div className="p-4 bg-muted/30 border-b flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Memory Visualization</h3>
              {promptUsed && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2" title={promptUsed}>
                  {promptUsed}
                </p>
              )}
            </div>
            {generatedImage && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownload}
                className="shrink-0"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </div>
          
          <div className="flex-1 relative flex items-center justify-center p-6 overflow-auto bg-muted/10">
            {generatedImage ? (
              <div className="relative w-full h-full flex flex-col items-center">
                <img
                  src={generatedImage}
                  alt="Generated childhood memory"
                  className="max-w-full max-h-[calc(100vh-280px)] object-contain rounded-md shadow-md"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                  <ImageIcon className="h-10 w-10 text-muted-foreground/60" />
                </div>
                <h3 className="text-lg font-medium">No image generated yet</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  {isGenerating 
                    ? "Your memory is being visualized..."
                    : error
                      ? "Could not generate image due to an error."
                      : "Describe your childhood memory and click the Generate Memory button to visualize it"}
                </p>
              </div>
            )}
          </div>
          
          <div className="p-4 border-t bg-muted/10">
            <h4 className="text-sm font-medium mb-2 flex items-center">
              <span className="bg-primary/10 text-primary p-1 rounded-full mr-2">💡</span>
              Tips for best results:
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>• Be specific about colors and details</span>
              <span>• Include sensory details like sounds</span>
              <span>• Describe your emotions</span>
              <span>• Name specific locations</span>
              <span>• Mention people who were with you</span>
              <span>• Include special objects or toys</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
