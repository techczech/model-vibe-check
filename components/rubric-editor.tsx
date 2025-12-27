"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  Plus,
  Trash2,
  GripVertical,
  ToggleLeft,
  Hash,
  CheckSquare,
} from "lucide-react";
import { generateId } from "@/lib/utils";
import type { Rubric, RubricItem, RubricItemType, RubricScope } from "@/lib/types";

interface RubricEditorProps {
  rubric?: Rubric;
  onSave: (rubric: Omit<Rubric, "createdAt" | "updatedAt">) => void;
  onClose: () => void;
}

const ITEM_TYPE_INFO: Record<RubricItemType, { icon: typeof ToggleLeft; label: string; description: string }> = {
  binary: {
    icon: ToggleLeft,
    label: "Yes/No",
    description: "Simple binary question",
  },
  scale: {
    icon: Hash,
    label: "Scale",
    description: "Rate on a scale (e.g., 1-5)",
  },
  checklist: {
    icon: CheckSquare,
    label: "Checklist",
    description: "Multiple items to check",
  },
};

const DEFAULT_SCALE_LABELS = ["Poor", "Fair", "Good", "Excellent"];

export function RubricEditor({ rubric, onSave, onClose }: RubricEditorProps) {
  const [name, setName] = useState(rubric?.name || "");
  const [description, setDescription] = useState(rubric?.description || "");
  const [scope, setScope] = useState<RubricScope>(rubric?.scope || "global");
  const [allowImpressionScore, setAllowImpressionScore] = useState(
    rubric?.allowImpressionScore ?? true
  );
  const [items, setItems] = useState<RubricItem[]>(rubric?.items || []);
  const [tags, setTags] = useState<string[]>(rubric?.tags || []);
  const [newTag, setNewTag] = useState("");

  const isEditing = !!rubric;
  const isDefault = rubric?.isDefault;

  function addItem() {
    const newItem: RubricItem = {
      id: generateId(),
      label: "",
      type: "binary",
      description: "",
    };
    setItems([...items, newItem]);
  }

  function updateItem(index: number, updates: Partial<RubricItem>) {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    
    // Initialize scale labels if switching to scale type
    if (updates.type === "scale" && !newItems[index].scaleLabels) {
      newItems[index].scaleLabels = [...DEFAULT_SCALE_LABELS];
    }
    // Initialize checklist items if switching to checklist type
    if (updates.type === "checklist" && !newItems[index].checklistItems) {
      newItems[index].checklistItems = ["Item 1", "Item 2"];
    }
    
    setItems(newItems);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function moveItem(index: number, direction: "up" | "down") {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === items.length - 1)
    ) {
      return;
    }

    const newItems = [...items];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setItems(newItems);
  }

  function addTag() {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  function updateScaleLabel(itemIndex: number, labelIndex: number, value: string) {
    const newItems = [...items];
    const labels = [...(newItems[itemIndex].scaleLabels || DEFAULT_SCALE_LABELS)];
    labels[labelIndex] = value;
    newItems[itemIndex].scaleLabels = labels;
    setItems(newItems);
  }

  function addScaleLabel(itemIndex: number) {
    const newItems = [...items];
    const labels = [...(newItems[itemIndex].scaleLabels || DEFAULT_SCALE_LABELS)];
    labels.push(`Level ${labels.length + 1}`);
    newItems[itemIndex].scaleLabels = labels;
    setItems(newItems);
  }

  function removeScaleLabel(itemIndex: number, labelIndex: number) {
    const newItems = [...items];
    const labels = [...(newItems[itemIndex].scaleLabels || DEFAULT_SCALE_LABELS)];
    if (labels.length > 2) {
      labels.splice(labelIndex, 1);
      newItems[itemIndex].scaleLabels = labels;
      setItems(newItems);
    }
  }

  function updateChecklistItem(itemIndex: number, checkIndex: number, value: string) {
    const newItems = [...items];
    const checkItems = [...(newItems[itemIndex].checklistItems || [])];
    checkItems[checkIndex] = value;
    newItems[itemIndex].checklistItems = checkItems;
    setItems(newItems);
  }

  function addChecklistItem(itemIndex: number) {
    const newItems = [...items];
    const checkItems = [...(newItems[itemIndex].checklistItems || [])];
    checkItems.push(`Item ${checkItems.length + 1}`);
    newItems[itemIndex].checklistItems = checkItems;
    setItems(newItems);
  }

  function removeChecklistItem(itemIndex: number, checkIndex: number) {
    const newItems = [...items];
    const checkItems = [...(newItems[itemIndex].checklistItems || [])];
    if (checkItems.length > 1) {
      checkItems.splice(checkIndex, 1);
      newItems[itemIndex].checklistItems = checkItems;
      setItems(newItems);
    }
  }

  function handleSave() {
    if (!name.trim()) return;
    
    onSave({
      id: rubric?.id || generateId(),
      name: name.trim(),
      description: description.trim() || undefined,
      items,
      allowImpressionScore,
      isDefault: rubric?.isDefault,
      scope,
      tags,
      promptIds: rubric?.promptIds || [],
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {isEditing ? "Edit Rubric" : "Create Rubric"}
            {isDefault && (
              <Badge variant="secondary" className="ml-2">
                Default
              </Badge>
            )}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Basic Info */}
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Code Quality Rubric"
                disabled={isDefault}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this rubric evaluate?"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scope">Scope</Label>
                <Select
                  value={scope}
                  onValueChange={(v) => setScope(v as RubricScope)}
                  disabled={isDefault}
                >
                  <SelectTrigger id="scope">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global (all prompts)</SelectItem>
                    <SelectItem value="prompt-specific">Prompt-specific</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Options</Label>
                <div className="flex items-center gap-2 pt-2">
                  <Checkbox
                    id="impressionScore"
                    checked={allowImpressionScore}
                    onCheckedChange={(c) => setAllowImpressionScore(c === true)}
                  />
                  <Label htmlFor="impressionScore" className="font-normal">
                    Allow 1-10 impression score
                  </Label>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag..."
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                />
                <Button variant="outline" size="sm" onClick={addTag}>
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Rubric Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Rubric Items</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={addItem}
                disabled={isDefault}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground">
                No items yet. Add your first evaluation criterion.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => {
                  const TypeIcon = ITEM_TYPE_INFO[item.type].icon;
                  
                  return (
                    <div
                      key={item.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      {/* Item Header */}
                      <div className="flex items-start gap-2">
                        <button
                          className="mt-2 text-muted-foreground hover:text-foreground cursor-grab"
                          disabled={isDefault}
                        >
                          <GripVertical className="h-4 w-4" />
                        </button>

                        <div className="flex-1 space-y-3">
                          <div className="flex gap-2">
                            <Input
                              value={item.label}
                              onChange={(e) =>
                                updateItem(index, { label: e.target.value })
                              }
                              placeholder="Criterion label"
                              className="flex-1"
                              disabled={isDefault}
                            />
                            <Select
                              value={item.type}
                              onValueChange={(v) =>
                                updateItem(index, { type: v as RubricItemType })
                              }
                              disabled={isDefault}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(ITEM_TYPE_INFO).map(([type, info]) => (
                                  <SelectItem key={type} value={type}>
                                    <span className="flex items-center gap-2">
                                      <info.icon className="h-3 w-3" />
                                      {info.label}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <Input
                            value={item.description || ""}
                            onChange={(e) =>
                              updateItem(index, { description: e.target.value })
                            }
                            placeholder="Description/guidance for evaluator (optional)"
                            className="text-sm"
                          />

                          {/* Scale labels */}
                          {item.type === "scale" && (
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">
                                Scale Labels
                              </Label>
                              <div className="flex flex-wrap gap-2">
                                {(item.scaleLabels || DEFAULT_SCALE_LABELS).map(
                                  (label, labelIndex) => (
                                    <div key={labelIndex} className="flex items-center gap-1">
                                      <Badge variant="outline" className="gap-1 pr-1">
                                        <span className="text-xs text-muted-foreground">
                                          {labelIndex + 1}:
                                        </span>
                                        <Input
                                          value={label}
                                          onChange={(e) =>
                                            updateScaleLabel(index, labelIndex, e.target.value)
                                          }
                                          className="h-6 w-20 text-xs border-0 p-1"
                                          disabled={isDefault}
                                        />
                                        {!isDefault && (item.scaleLabels?.length || 4) > 2 && (
                                          <button
                                            onClick={() => removeScaleLabel(index, labelIndex)}
                                            className="hover:text-destructive"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        )}
                                      </Badge>
                                    </div>
                                  )
                                )}
                                {!isDefault && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => addScaleLabel(index)}
                                    className="h-6"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Checklist items */}
                          {item.type === "checklist" && (
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">
                                Checklist Items
                              </Label>
                              <div className="space-y-1">
                                {(item.checklistItems || []).map((checkItem, checkIndex) => (
                                  <div key={checkIndex} className="flex items-center gap-2">
                                    <Checkbox disabled className="opacity-50" />
                                    <Input
                                      value={checkItem}
                                      onChange={(e) =>
                                        updateChecklistItem(index, checkIndex, e.target.value)
                                      }
                                      className="h-8 flex-1"
                                      disabled={isDefault}
                                    />
                                    {!isDefault && (item.checklistItems?.length || 0) > 1 && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => removeChecklistItem(index, checkIndex)}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                                {!isDefault && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => addChecklistItem(index)}
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add Item
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {!isDefault && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(index)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/30">
          <div className="text-sm text-muted-foreground">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              {isEditing ? "Save Changes" : "Create Rubric"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
