
import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Loader2, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const ChildhoodMemoryGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState("");
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState("Default");
  const [era, setEra] = useState("Not specified");
  const [mood, setMood] = useState("Nostalgic");
  const [gender, setGender] = useState("Not specified");
  const [customGender, setCustomGender] = useState("");
  const [age, setAge] = useState("Not specified");
  const [location, setLocation] = useState("Not specified");
  const [season, setSeason] = useState("Not specified");
  const [timeOfDay, setTimeOfDay] = useState("Not specified");
  const [weather, setWeather] = useState("Not specified");
  const [activity, setActivity] = useState("Not specified");
  const [companions, setCompanions] = useState("Not specified");
  const [specialObject, setSpecialObject] = useState("Not specified");

  const exampleMemories = [
    "Playing with sparklers on a warm summer night, surrounded by family in the backyard. The sky was dark blue and filled with stars.",
    "Building a sandcastle at the beach when I was 7, with my red bucket and blue shovel. The waves were gentle and the sun was setting.",
    "Sitting by the fireplace during Christmas morning, unwrapping presents in pajamas while snow fell outside the window.",
    "Climbing the old oak tree in my grandparents' garden, hiding in the branches and watching the world below. Birds were singing and sunlight filtered through leaves.",
    "Riding my bicycle with training wheels for the first time down our neighborhood street. Dad was running alongside me and I felt so proud."
  ];

  const handleUseExample = (index: number) => {
    setDescription(exampleMemories[index]);
  };

  const handleGenerateImage = async () => {
    if (!description.trim()) {
      toast({
        title: "Description required",
        description: "Please describe your childhood memory first",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedImage("");

    try {
      const { data, error } = await supabase.functions.invoke('generate-childhood-image', {
        body: {
          description,
          style,
          era,
          mood,
          gender,
          customGender,
          age,
          location,
          season,
          timeOfDay,
          weather,
          activity,
          companions,
          specialObject
        }
      });

      if (error) throw error;
      
      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
        toast({
          title: "Memory visualized!",
          description: "Your childhood memory has been transformed into an image",
        });
      } else {
        throw new Error("No image was generated");
      }
    } catch (error) {
      console.error('Image generation error:', error);
      toast({
        title: "Generation Error",
        description: "Failed to generate image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <span>🧸 Childhood Memory Visualizer</span>
          </CardTitle>
          <CardDescription>
            Transform your cherished childhood memories into beautiful images
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <Label htmlFor="description">Describe your childhood memory</Label>
                <Textarea
                  id="description"
                  placeholder="Be detailed and specific about your memory..."
                  className="min-h-[120px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              
              <div>
                <Label>Example memories</Label>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {exampleMemories.map((memory, index) => (
                    <Button 
                      key={index}
                      variant="outline" 
                      className="h-auto py-2 px-4 justify-start font-normal text-left"
                      onClick={() => handleUseExample(index)}
                    >
                      {memory.length > 70 ? memory.substring(0, 70) + "..." : memory}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="style">Art Style</Label>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger id="style">
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Default">Default</SelectItem>
                      <SelectItem value="Watercolor">Watercolor</SelectItem>
                      <SelectItem value="Oil painting">Oil painting</SelectItem>
                      <SelectItem value="Photography">Photography</SelectItem>
                      <SelectItem value="Anime">Anime</SelectItem>
                      <SelectItem value="Pixar">Pixar</SelectItem>
                      <SelectItem value="Vintage film">Vintage film</SelectItem>
                      <SelectItem value="Dreamy illustration">Dreamy illustration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="era">Era/Decade</Label>
                  <Select value={era} onValueChange={setEra}>
                    <SelectTrigger id="era">
                      <SelectValue placeholder="Select era" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Not specified">Not specified</SelectItem>
                      <SelectItem value="1970s">1970s</SelectItem>
                      <SelectItem value="1980s">1980s</SelectItem>
                      <SelectItem value="1990s">1990s</SelectItem>
                      <SelectItem value="2000s">2000s</SelectItem>
                      <SelectItem value="2010s">2010s</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mood">Emotional Tone</Label>
                  <Select value={mood} onValueChange={setMood}>
                    <SelectTrigger id="mood">
                      <SelectValue placeholder="Select mood" />
                    </SelectTrigger>
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
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">Child's Gender</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Not specified">Not specified</SelectItem>
                      <SelectItem value="Boy">Boy</SelectItem>
                      <SelectItem value="Girl">Girl</SelectItem>
                      <SelectItem value="Non-binary">Non-binary</SelectItem>
                      <SelectItem value="Custom">Custom...</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {gender === "Custom" && (
                    <div className="mt-2">
                      <Input
                        placeholder="Enter specific gender identity"
                        value={customGender}
                        onChange={(e) => setCustomGender(e.target.value)}
                      />
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="age">Child's Age</Label>
                  <Select value={age} onValueChange={setAge}>
                    <SelectTrigger id="age">
                      <SelectValue placeholder="Select age" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Not specified">Not specified</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="7">7</SelectItem>
                      <SelectItem value="8">8</SelectItem>
                      <SelectItem value="9">9</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="11">11</SelectItem>
                      <SelectItem value="12">12</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="advanced-options">
                  <AccordionTrigger>Advanced Customization Options</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="location">Location</Label>
                          <Select value={location} onValueChange={setLocation}>
                            <SelectTrigger id="location">
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
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
                              <SelectItem value="City streets">City streets</SelectItem>
                              <SelectItem value="Mountains">Mountains</SelectItem>
                              <SelectItem value="Lake">Lake</SelectItem>
                              <SelectItem value="Amusement park">Amusement park</SelectItem>
                              <SelectItem value="Neighborhood">Neighborhood</SelectItem>
                              <SelectItem value="Birthday party">Birthday party</SelectItem>
                              <SelectItem value="Classroom">Classroom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="season">Season</Label>
                          <Select value={season} onValueChange={setSeason}>
                            <SelectTrigger id="season">
                              <SelectValue placeholder="Select season" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Not specified">Not specified</SelectItem>
                              <SelectItem value="Summer">Summer</SelectItem>
                              <SelectItem value="Fall/Autumn">Fall/Autumn</SelectItem>
                              <SelectItem value="Winter">Winter</SelectItem>
                              <SelectItem value="Spring">Spring</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="timeOfDay">Time of Day</Label>
                          <Select value={timeOfDay} onValueChange={setTimeOfDay}>
                            <SelectTrigger id="timeOfDay">
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Not specified">Not specified</SelectItem>
                              <SelectItem value="Morning">Morning</SelectItem>
                              <SelectItem value="Afternoon">Afternoon</SelectItem>
                              <SelectItem value="Evening">Evening</SelectItem>
                              <SelectItem value="Night">Night</SelectItem>
                              <SelectItem value="Sunrise">Sunrise</SelectItem>
                              <SelectItem value="Sunset">Sunset</SelectItem>
                              <SelectItem value="Golden hour">Golden hour</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="weather">Weather</Label>
                          <Select value={weather} onValueChange={setWeather}>
                            <SelectTrigger id="weather">
                              <SelectValue placeholder="Select weather" />
                            </SelectTrigger>
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
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="activity">Activity</Label>
                          <Select value={activity} onValueChange={setActivity}>
                            <SelectTrigger id="activity">
                              <SelectValue placeholder="Select activity" />
                            </SelectTrigger>
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
                              <SelectItem value="Learning">Learning</SelectItem>
                              <SelectItem value="Exploring">Exploring</SelectItem>
                              <SelectItem value="Eating">Eating</SelectItem>
                              <SelectItem value="Opening presents">Opening presents</SelectItem>
                              <SelectItem value="Camping">Camping</SelectItem>
                              <SelectItem value="Gardening">Gardening</SelectItem>
                              <SelectItem value="Dancing">Dancing</SelectItem>
                              <SelectItem value="Singing">Singing</SelectItem>
                              <SelectItem value="Playing sports">Playing sports</SelectItem>
                              <SelectItem value="Playing video games">Playing video games</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="companions">Companions</Label>
                          <Select value={companions} onValueChange={setCompanions}>
                            <SelectTrigger id="companions">
                              <SelectValue placeholder="Select companions" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Not specified">Not specified</SelectItem>
                              <SelectItem value="Family">Family</SelectItem>
                              <SelectItem value="Friends">Friends</SelectItem>
                              <SelectItem value="Parents">Parents</SelectItem>
                              <SelectItem value="Siblings">Siblings</SelectItem>
                              <SelectItem value="Grandparents">Grandparents</SelectItem>
                              <SelectItem value="Cousins">Cousins</SelectItem>
                              <SelectItem value="Classmates">Classmates</SelectItem>
                              <SelectItem value="Pet">Pet</SelectItem>
                              <SelectItem value="Best friend">Best friend</SelectItem>
                              <SelectItem value="Alone">Alone</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="specialObject">Special Object/Toy</Label>
                        <Select value={specialObject} onValueChange={setSpecialObject}>
                          <SelectTrigger id="specialObject">
                            <SelectValue placeholder="Select special object" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Not specified">Not specified</SelectItem>
                            <SelectItem value="Bicycle">Bicycle</SelectItem>
                            <SelectItem value="Teddy bear">Teddy bear</SelectItem>
                            <SelectItem value="Doll">Doll</SelectItem>
                            <SelectItem value="Action figure">Action figure</SelectItem>
                            <SelectItem value="Ball">Ball</SelectItem>
                            <SelectItem value="Console/Video game">Console/Video game</SelectItem>
                            <SelectItem value="Book">Book</SelectItem>
                            <SelectItem value="Kite">Kite</SelectItem>
                            <SelectItem value="Musical instrument">Musical instrument</SelectItem>
                            <SelectItem value="Camera">Camera</SelectItem>
                            <SelectItem value="Art supplies">Art supplies</SelectItem>
                            <SelectItem value="Skateboard">Skateboard</SelectItem>
                            <SelectItem value="Radio">Radio</SelectItem>
                            <SelectItem value="Blanket fort">Blanket fort</SelectItem>
                            <SelectItem value="Tree house">Tree house</SelectItem>
                            <SelectItem value="Swing set">Swing set</SelectItem>
                            <SelectItem value="Sand box">Sand box</SelectItem>
                            <SelectItem value="Flashlight">Flashlight</SelectItem>
                            <SelectItem value="Board game">Board game</SelectItem>
                            <SelectItem value="Trading cards">Trading cards</SelectItem>
                            <SelectItem value="Sports equipment">Sports equipment</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              
              <Button 
                onClick={handleGenerateImage} 
                disabled={isGenerating || !description.trim()} 
                className="w-full py-6 text-lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating your memory...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-5 w-5" />
                    Generate Memory Image
                  </>
                )}
              </Button>
            </div>
            
            <div className="bg-muted rounded-lg flex flex-col items-center justify-center p-4 min-h-[500px]">
              {generatedImage ? (
                <img 
                  src={generatedImage} 
                  alt="Generated childhood memory" 
                  className="w-full h-auto max-h-[500px] object-contain rounded-md"
                />
              ) : (
                <div className="text-center p-8">
                  <div className="bg-background/50 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                    <Wand2 className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">No image generated yet</h3>
                  <p className="text-muted-foreground">
                    Fill in the details of your childhood memory and click "Generate Memory Image"
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-6 flex flex-col">
          <div className="w-full bg-muted rounded-lg p-4">
            <h3 className="font-medium text-lg mb-2">💡 Tips for vivid memory recreation</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Be specific about colors, clothing, toys, and decorations</li>
              <li>Include sensory details like sounds, smells, and textures</li>
              <li>Mention the time of day, weather, and season</li>
              <li>Describe your emotions and the people who were with you</li>
              <li>Name specific locations like "my grandmother's kitchen" or "Pine Street Elementary"</li>
              <li>Include small details that make the memory special to you</li>
            </ul>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};
