import { ChevronLeft, ChevronRight, Upload, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const samplePhotos = [
  {
    id: "1",
    url: "/happy-family-beach-vacation-sunset.jpg",
    caption: "Beach Day",
  },
  {
    id: "2",
    url: "/kids-birthday-party-balloons-cake.jpg",
    caption: "Emma's Birthday",
  },
  {
    id: "3",
    url: "/family-hiking-mountains-nature-trail.jpg",
    caption: "Mountain Hike",
  },
  {
    id: "4",
    url: "/golden-retriever-dog-playing-park.jpg",
    caption: "Dogo at the Park",
  },
  {
    id: "5",
    url: "/thanksgiving-dinner-family-table-food.jpg",
    caption: "Thanksgiving",
  },
  {
    id: "6",
    url: "/kids-soccer-game-field-celebration.jpg",
    caption: "Soccer Championship",
  },
  {
    id: "7",
    url: "/family-christmas-tree-presents-decorations.jpg",
    caption: "Christmas Morning",
  },
  {
    id: "8",
    url: "/backyard-barbecue-summer-party.jpg",
    caption: "Summer BBQ",
  },
];

export function PhotosView() {
  const [selectedPhoto, setSelectedPhoto] = useState<
    (typeof samplePhotos)[0] | null
  >(null);

  const currentIndex = selectedPhoto
    ? samplePhotos.findIndex((p) => p.id === selectedPhoto.id)
    : -1;

  const goToPrev = () => {
    if (currentIndex > 0) {
      setSelectedPhoto(samplePhotos[currentIndex - 1]);
    }
  };

  const goToNext = () => {
    if (currentIndex < samplePhotos.length - 1) {
      setSelectedPhoto(samplePhotos[currentIndex + 1]);
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Family Photos</h2>
          <Button className="bg-primary hover:bg-primary/90">
            <Upload className="h-4 w-4 mr-2" />
            Upload Photo
          </Button>
        </div>

        {/* Photo grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {samplePhotos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => setSelectedPhoto(photo)}
              className="group relative aspect-square rounded-xl overflow-hidden bg-muted"
            >
              <img
                src={photo.url || "/placeholder.svg"}
                alt={photo.caption}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="absolute bottom-3 left-3 text-card text-sm font-medium">
                  {photo.caption}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Lightbox */}
        {selectedPhoto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-card hover:bg-card/20"
              onClick={() => setSelectedPhoto(null)}
            >
              <X className="h-6 w-6" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute left-4 text-card hover:bg-card/20",
                currentIndex === 0 && "opacity-50 cursor-not-allowed",
              )}
              onClick={goToPrev}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>

            <div className="max-w-4xl max-h-[80vh] mx-16">
              <img
                src={selectedPhoto.url || "/placeholder.svg"}
                alt={selectedPhoto.caption}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
              <p className="text-card text-center mt-4 text-lg font-medium">
                {selectedPhoto.caption}
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute right-4 text-card hover:bg-card/20",
                currentIndex === samplePhotos.length - 1 &&
                  "opacity-50 cursor-not-allowed",
              )}
              onClick={goToNext}
              disabled={currentIndex === samplePhotos.length - 1}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
