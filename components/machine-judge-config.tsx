"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Plus, X, AlertTriangle, Sparkles, RefreshCw } from "lucide-react";
import type { MachineJudgeConfig } from "@/lib/types";
import { generatePreviewCases, type TestCase } from "@/lib/evaluation/generators";

const MACHINE_TYPES = [
  { value: "contains", label: "Contains", description: "Check if response contains specific terms" },
  { value: "regex", label: "Regex Pattern", description: "Match response against a regex" },
  { value: "exact", label: "Exact Match", description: "Response must match exactly" },
  { value: "json-schema", label: "JSON Schema", description: "Validate JSON structure" },
  { value: "custom", label: "Custom Function", description: "Run custom JavaScript (local only)" },
  { value: "word-count", label: "Word Count", description: "Verify word/character/sentence count" },
  { value: "string-reversal", label: "String Reversal", description: "Check for reversed string" },
  { value: "arithmetic", label: "Arithmetic", description: "Verify numeric calculation" },
  { value: "list-sort", label: "List Sort", description: "Check list ordering" },
  { value: "string-reversal-benchmark", label: "String Reversal Benchmark", description: "Generate N strings, check reversal accuracy" },
  { value: "arithmetic-benchmark", label: "Arithmetic Benchmark", description: "Generate N math problems, check accuracy" },
] as const;

interface MachineJudgeConfigProps {
  config: MachineJudgeConfig | undefined;
  onChange: (config: MachineJudgeConfig) => void;
  disabled?: boolean;
}

export function MachineJudgeConfigEditor({
  config,
  onChange,
  disabled = false,
}: MachineJudgeConfigProps) {
  // Default config
  const currentConfig: MachineJudgeConfig = config || {
    type: "contains",
    criteria: "",
    caseSensitive: false,
  };

  function updateConfig(updates: Partial<MachineJudgeConfig>) {
    onChange({ ...currentConfig, ...updates });
  }

  function updateType(type: MachineJudgeConfig["type"]) {
    // Reset type-specific configs when changing type
    const newConfig: MachineJudgeConfig = {
      type,
      criteria: "",
      caseSensitive: false,
    };

    // Add default type-specific config
    if (type === "word-count") {
      newConfig.wordCountConfig = {
        targetCount: 100,
        tolerance: 10,
        countMode: "words",
      };
    } else if (type === "string-reversal") {
      newConfig.stringReversalConfig = {
        inputString: "",
        caseSensitive: false,
      };
    } else if (type === "arithmetic") {
      newConfig.arithmeticConfig = {
        expression: "",
        expectedResult: 0,
      };
    } else if (type === "list-sort") {
      newConfig.listSortConfig = {
        inputList: [],
        sortOrder: "ascending",
      };
    } else if (type === "string-reversal-benchmark") {
      newConfig.stringReversalBenchmarkConfig = {
        count: 10,
        minLength: 3,
        maxLength: 12,
        charType: "mixed",
        caseSensitive: false,
        passThreshold: 80,
      };
    } else if (type === "arithmetic-benchmark") {
      newConfig.arithmeticBenchmarkConfig = {
        count: 10,
        operators: ["+", "-", "*"],
        minOperand: 1,
        maxOperand: 99,
        complexity: "simple",
        passThreshold: 80,
      };
    }

    onChange(newConfig);
  }

  const selectedTypeInfo = MACHINE_TYPES.find((t) => t.value === currentConfig.type);

  return (
    <div className="space-y-4">
      {/* Type Selection */}
      <div className="space-y-2">
        <Label>Evaluation Type</Label>
        <Select
          value={currentConfig.type}
          onValueChange={(v) => updateType(v as MachineJudgeConfig["type"])}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MACHINE_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex flex-col">
                  <span>{type.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {type.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedTypeInfo && (
          <p className="text-xs text-muted-foreground">{selectedTypeInfo.description}</p>
        )}
      </div>

      {/* Type-specific config */}
      {renderTypeConfig(currentConfig, updateConfig, disabled)}
    </div>
  );
}

function renderTypeConfig(
  config: MachineJudgeConfig,
  updateConfig: (updates: Partial<MachineJudgeConfig>) => void,
  disabled: boolean
) {
  switch (config.type) {
    case "contains":
      return (
        <ContainsConfig config={config} updateConfig={updateConfig} disabled={disabled} />
      );
    case "regex":
      return (
        <RegexConfig config={config} updateConfig={updateConfig} disabled={disabled} />
      );
    case "exact":
      return (
        <ExactConfig config={config} updateConfig={updateConfig} disabled={disabled} />
      );
    case "json-schema":
      return (
        <JsonSchemaConfig config={config} updateConfig={updateConfig} disabled={disabled} />
      );
    case "custom":
      return (
        <CustomConfig config={config} updateConfig={updateConfig} disabled={disabled} />
      );
    case "word-count":
      return (
        <WordCountConfig config={config} updateConfig={updateConfig} disabled={disabled} />
      );
    case "string-reversal":
      return (
        <StringReversalConfig config={config} updateConfig={updateConfig} disabled={disabled} />
      );
    case "arithmetic":
      return (
        <ArithmeticConfig config={config} updateConfig={updateConfig} disabled={disabled} />
      );
    case "list-sort":
      return (
        <ListSortConfig config={config} updateConfig={updateConfig} disabled={disabled} />
      );
    case "string-reversal-benchmark":
      return (
        <StringReversalBenchmarkConfig config={config} updateConfig={updateConfig} disabled={disabled} />
      );
    case "arithmetic-benchmark":
      return (
        <ArithmeticBenchmarkConfig config={config} updateConfig={updateConfig} disabled={disabled} />
      );
    default:
      return null;
  }
}

// ============================================
// Type-specific configuration components
// ============================================

function ContainsConfig({
  config,
  updateConfig,
  disabled,
}: {
  config: MachineJudgeConfig;
  updateConfig: (updates: Partial<MachineJudgeConfig>) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Terms to Find (comma-separated)</Label>
        <Textarea
          value={config.criteria || ""}
          onChange={(e) => updateConfig({ criteria: e.target.value })}
          placeholder="term1, term2, term3"
          rows={2}
          disabled={disabled}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Response must contain ALL of these terms to pass
        </p>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="case-sensitive"
          checked={config.caseSensitive || false}
          onCheckedChange={(checked) => updateConfig({ caseSensitive: !!checked })}
          disabled={disabled}
        />
        <Label htmlFor="case-sensitive" className="text-sm font-normal">
          Case sensitive
        </Label>
      </div>
    </div>
  );
}

function RegexConfig({
  config,
  updateConfig,
  disabled,
}: {
  config: MachineJudgeConfig;
  updateConfig: (updates: Partial<MachineJudgeConfig>) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Regular Expression Pattern</Label>
        <Textarea
          value={config.criteria || ""}
          onChange={(e) => updateConfig({ criteria: e.target.value })}
          placeholder="(pattern1|pattern2)"
          rows={2}
          disabled={disabled}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Response must match this regex pattern
        </p>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="case-sensitive"
          checked={config.caseSensitive || false}
          onCheckedChange={(checked) => updateConfig({ caseSensitive: !!checked })}
          disabled={disabled}
        />
        <Label htmlFor="case-sensitive" className="text-sm font-normal">
          Case sensitive (adds 'i' flag if unchecked)
        </Label>
      </div>
    </div>
  );
}

function ExactConfig({
  config,
  updateConfig,
  disabled,
}: {
  config: MachineJudgeConfig;
  updateConfig: (updates: Partial<MachineJudgeConfig>) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Expected Exact Response</Label>
        <Textarea
          value={config.criteria || ""}
          onChange={(e) => updateConfig({ criteria: e.target.value })}
          placeholder="The exact response expected..."
          rows={4}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Response must match this exactly (whitespace trimmed)
        </p>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="case-sensitive"
          checked={config.caseSensitive || false}
          onCheckedChange={(checked) => updateConfig({ caseSensitive: !!checked })}
          disabled={disabled}
        />
        <Label htmlFor="case-sensitive" className="text-sm font-normal">
          Case sensitive
        </Label>
      </div>
    </div>
  );
}

function JsonSchemaConfig({
  config,
  updateConfig,
  disabled,
}: {
  config: MachineJudgeConfig;
  updateConfig: (updates: Partial<MachineJudgeConfig>) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>JSON Schema (required keys)</Label>
      <Textarea
        value={config.criteria || ""}
        onChange={(e) => updateConfig({ criteria: e.target.value })}
        placeholder={'{"required": ["name", "age"], "properties": {...}}'}
        rows={6}
        disabled={disabled}
        className="font-mono text-sm"
      />
      <p className="text-xs text-muted-foreground">
        Response must be valid JSON containing these required keys
      </p>
    </div>
  );
}

function CustomConfig({
  config,
  updateConfig,
  disabled,
}: {
  config: MachineJudgeConfig;
  updateConfig: (updates: Partial<MachineJudgeConfig>) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded text-yellow-800 dark:text-yellow-200">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="text-xs">
          Custom functions run JavaScript locally. Use with caution.
        </span>
      </div>
      <div className="space-y-2">
        <Label>Custom JavaScript Function</Label>
        <Textarea
          value={config.criteria || ""}
          onChange={(e) => updateConfig({ criteria: e.target.value })}
          placeholder={`// Return { pass: boolean, details: string }
(response) => {
  const hasKeyword = response.includes('hello');
  return {
    pass: hasKeyword,
    details: hasKeyword ? 'Found keyword' : 'Missing keyword'
  };
}`}
          rows={8}
          disabled={disabled}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Function receives response string, must return {`{ pass: boolean, details: string }`}
        </p>
      </div>
    </div>
  );
}

function WordCountConfig({
  config,
  updateConfig,
  disabled,
}: {
  config: MachineJudgeConfig;
  updateConfig: (updates: Partial<MachineJudgeConfig>) => void;
  disabled: boolean;
}) {
  const wordCountConfig = config.wordCountConfig || {
    targetCount: 100,
    tolerance: 10,
    countMode: "words" as const,
  };

  function updateWordCountConfig(
    updates: Partial<NonNullable<MachineJudgeConfig["wordCountConfig"]>>
  ) {
    updateConfig({
      wordCountConfig: { ...wordCountConfig, ...updates },
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Count Mode</Label>
        <RadioGroup
          value={wordCountConfig.countMode}
          onValueChange={(v) =>
            updateWordCountConfig({ countMode: v as "words" | "characters" | "sentences" })
          }
          disabled={disabled}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="words" id="words" />
            <Label htmlFor="words" className="font-normal">Words</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="characters" id="characters" />
            <Label htmlFor="characters" className="font-normal">Characters</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="sentences" id="sentences" />
            <Label htmlFor="sentences" className="font-normal">Sentences</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Target Count</Label>
          <Input
            type="number"
            value={wordCountConfig.targetCount}
            onChange={(e) => updateWordCountConfig({ targetCount: parseInt(e.target.value) || 0 })}
            min={0}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label>Tolerance (±)</Label>
          <Input
            type="number"
            value={wordCountConfig.tolerance || 0}
            onChange={(e) => updateWordCountConfig({ tolerance: parseInt(e.target.value) || 0 })}
            min={0}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            Allow ±{wordCountConfig.tolerance || 0} from target
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Response must have {wordCountConfig.targetCount - (wordCountConfig.tolerance || 0)} to{" "}
        {wordCountConfig.targetCount + (wordCountConfig.tolerance || 0)} {wordCountConfig.countMode}
      </p>
    </div>
  );
}

function StringReversalConfig({
  config,
  updateConfig,
  disabled,
}: {
  config: MachineJudgeConfig;
  updateConfig: (updates: Partial<MachineJudgeConfig>) => void;
  disabled: boolean;
}) {
  const stringReversalConfig = config.stringReversalConfig || {
    inputString: "",
    caseSensitive: false,
  };

  function updateStringReversalConfig(
    updates: Partial<NonNullable<MachineJudgeConfig["stringReversalConfig"]>>
  ) {
    updateConfig({
      stringReversalConfig: { ...stringReversalConfig, ...updates },
    });
  }

  const reversed = stringReversalConfig.inputString.split("").reverse().join("");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Input String to Reverse</Label>
        <Input
          value={stringReversalConfig.inputString}
          onChange={(e) => updateStringReversalConfig({ inputString: e.target.value })}
          placeholder="hello world"
          disabled={disabled}
        />
      </div>

      {stringReversalConfig.inputString && (
        <div className="p-3 bg-muted rounded-md">
          <p className="text-xs text-muted-foreground mb-1">Expected in response:</p>
          <code className="text-sm font-mono">{reversed}</code>
        </div>
      )}

      <div className="flex items-center space-x-2">
        <Checkbox
          id="reversal-case-sensitive"
          checked={stringReversalConfig.caseSensitive || false}
          onCheckedChange={(checked) => updateStringReversalConfig({ caseSensitive: !!checked })}
          disabled={disabled}
        />
        <Label htmlFor="reversal-case-sensitive" className="text-sm font-normal">
          Case sensitive
        </Label>
      </div>
    </div>
  );
}

function ArithmeticConfig({
  config,
  updateConfig,
  disabled,
}: {
  config: MachineJudgeConfig;
  updateConfig: (updates: Partial<MachineJudgeConfig>) => void;
  disabled: boolean;
}) {
  const arithmeticConfig = config.arithmeticConfig || {
    expression: "",
    expectedResult: 0,
  };

  function updateArithmeticConfig(
    updates: Partial<NonNullable<MachineJudgeConfig["arithmeticConfig"]>>
  ) {
    updateConfig({
      arithmeticConfig: { ...arithmeticConfig, ...updates },
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Expression</Label>
          <Input
            value={arithmeticConfig.expression}
            onChange={(e) => updateArithmeticConfig({ expression: e.target.value })}
            placeholder="123 * 456"
            disabled={disabled}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">For display only</p>
        </div>
        <div className="space-y-2">
          <Label>Expected Result</Label>
          <Input
            type="number"
            value={arithmeticConfig.expectedResult}
            onChange={(e) =>
              updateArithmeticConfig({ expectedResult: parseFloat(e.target.value) || 0 })
            }
            placeholder="56088"
            disabled={disabled}
            className="font-mono"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Extract Pattern (optional)</Label>
        <Input
          value={arithmeticConfig.extractPattern || ""}
          onChange={(e) => updateArithmeticConfig({ extractPattern: e.target.value })}
          placeholder="The answer is (\d+)"
          disabled={disabled}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Regex to extract the number from response. Leave empty to find any number.
        </p>
      </div>
    </div>
  );
}

function ListSortConfig({
  config,
  updateConfig,
  disabled,
}: {
  config: MachineJudgeConfig;
  updateConfig: (updates: Partial<MachineJudgeConfig>) => void;
  disabled: boolean;
}) {
  const listSortConfig = config.listSortConfig || {
    inputList: [],
    sortOrder: "ascending" as const,
  };
  const [newItem, setNewItem] = useState("");

  function updateListSortConfig(
    updates: Partial<NonNullable<MachineJudgeConfig["listSortConfig"]>>
  ) {
    updateConfig({
      listSortConfig: { ...listSortConfig, ...updates },
    });
  }

  function addItem() {
    if (newItem.trim()) {
      updateListSortConfig({
        inputList: [...listSortConfig.inputList, newItem.trim()],
      });
      setNewItem("");
    }
  }

  function removeItem(index: number) {
    updateListSortConfig({
      inputList: listSortConfig.inputList.filter((_, i) => i !== index),
    });
  }

  // Calculate expected sorted order
  const sortedList = [...listSortConfig.inputList].sort((a, b) => {
    if (listSortConfig.sortOrder === "alphabetical") {
      return a.localeCompare(b);
    } else if (listSortConfig.sortOrder === "descending") {
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
      return b.localeCompare(a);
    } else {
      // ascending
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    }
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Sort Order</Label>
        <RadioGroup
          value={listSortConfig.sortOrder}
          onValueChange={(v) =>
            updateListSortConfig({ sortOrder: v as "ascending" | "descending" | "alphabetical" })
          }
          disabled={disabled}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="ascending" id="ascending" />
            <Label htmlFor="ascending" className="font-normal">Ascending</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="descending" id="descending" />
            <Label htmlFor="descending" className="font-normal">Descending</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="alphabetical" id="alphabetical" />
            <Label htmlFor="alphabetical" className="font-normal">Alphabetical</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label>List Items</Label>
        <div className="flex gap-2">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add item..."
            disabled={disabled}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addItem();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={addItem}
            disabled={disabled || !newItem.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {listSortConfig.inputList.length > 0 && (
          <div className="space-y-1 mt-2">
            {listSortConfig.inputList.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 bg-muted rounded text-sm"
              >
                <span className="flex-1">{item}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeItem(index)}
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {listSortConfig.inputList.length > 0 && (
        <div className="p-3 bg-muted rounded-md">
          <p className="text-xs text-muted-foreground mb-1">Expected order in response:</p>
          <code className="text-sm font-mono">{sortedList.join(", ")}</code>
        </div>
      )}
    </div>
  );
}

// ============================================
// Benchmark Configuration Components
// ============================================

function StringReversalBenchmarkConfig({
  config,
  updateConfig,
  disabled,
}: {
  config: MachineJudgeConfig;
  updateConfig: (updates: Partial<MachineJudgeConfig>) => void;
  disabled: boolean;
}) {
  const benchmarkConfig = config.stringReversalBenchmarkConfig || {
    count: 10,
    minLength: 3,
    maxLength: 12,
    charType: "mixed" as const,
    caseSensitive: false,
    passThreshold: 80,
  };

  const [previewCases, setPreviewCases] = useState<TestCase[]>([]);

  function updateBenchmarkConfig(
    updates: Partial<NonNullable<MachineJudgeConfig["stringReversalBenchmarkConfig"]>>
  ) {
    updateConfig({
      stringReversalBenchmarkConfig: { ...benchmarkConfig, ...updates },
    });
  }

  function refreshPreview() {
    const cases = generatePreviewCases("string-reversal", {
      count: 3,
      minLength: benchmarkConfig.minLength,
      maxLength: benchmarkConfig.maxLength,
      charType: benchmarkConfig.charType,
    }, 3);
    setPreviewCases(cases);
  }

  // Generate initial preview
  useState(() => {
    refreshPreview();
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/20 rounded">
        <Sparkles className="h-4 w-4 shrink-0 text-primary" />
        <span className="text-xs">
          Generates {benchmarkConfig.count} random strings and checks how many reversals the model gets correct.
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Number of Test Cases</Label>
          <Input
            type="number"
            value={benchmarkConfig.count}
            onChange={(e) => updateBenchmarkConfig({ count: Math.max(1, Math.min(50, parseInt(e.target.value) || 10)) })}
            min={1}
            max={50}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">5-50 recommended</p>
        </div>

        <div className="space-y-2">
          <Label>Character Type</Label>
          <Select
            value={benchmarkConfig.charType}
            onValueChange={(v) => updateBenchmarkConfig({ charType: v as "random" | "words" | "mixed" })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="random">Random Characters</SelectItem>
              <SelectItem value="words">Dictionary Words</SelectItem>
              <SelectItem value="mixed">Mixed (50/50)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Min String Length</Label>
          <Input
            type="number"
            value={benchmarkConfig.minLength}
            onChange={(e) => updateBenchmarkConfig({ minLength: Math.max(2, Math.min(benchmarkConfig.maxLength, parseInt(e.target.value) || 3)) })}
            min={2}
            max={benchmarkConfig.maxLength}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label>Max String Length</Label>
          <Input
            type="number"
            value={benchmarkConfig.maxLength}
            onChange={(e) => updateBenchmarkConfig({ maxLength: Math.max(benchmarkConfig.minLength, Math.min(50, parseInt(e.target.value) || 12)) })}
            min={benchmarkConfig.minLength}
            max={50}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="benchmark-case-sensitive"
          checked={benchmarkConfig.caseSensitive || false}
          onCheckedChange={(checked) => updateBenchmarkConfig({ caseSensitive: !!checked })}
          disabled={disabled}
        />
        <Label htmlFor="benchmark-case-sensitive" className="text-sm font-normal">
          Case sensitive matching
        </Label>
      </div>

      <div className="space-y-3">
        <Label>Pass Threshold: {benchmarkConfig.passThreshold}%</Label>
        <Slider
          value={[benchmarkConfig.passThreshold]}
          onValueChange={([v]) => updateBenchmarkConfig({ passThreshold: v })}
          min={0}
          max={100}
          step={5}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Model must correctly reverse at least {benchmarkConfig.passThreshold}% of the {benchmarkConfig.count} strings to pass
        </p>
      </div>

      <div className="p-3 bg-muted rounded-md space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Preview examples:</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={refreshPreview}
            disabled={disabled}
            className="h-6 px-2"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
        <div className="space-y-1 font-mono text-sm">
          {previewCases.map((tc, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-muted-foreground">"{tc.input}"</span>
              <span>→</span>
              <span className="text-green-600 dark:text-green-400">"{tc.expected}"</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ArithmeticBenchmarkConfig({
  config,
  updateConfig,
  disabled,
}: {
  config: MachineJudgeConfig;
  updateConfig: (updates: Partial<MachineJudgeConfig>) => void;
  disabled: boolean;
}) {
  const benchmarkConfig = config.arithmeticBenchmarkConfig || {
    count: 10,
    operators: ["+", "-", "*"] as ('+' | '-' | '*' | '/')[]  ,
    minOperand: 1,
    maxOperand: 99,
    complexity: "simple" as const,
    passThreshold: 80,
  };

  const [previewCases, setPreviewCases] = useState<TestCase[]>([]);

  function updateBenchmarkConfig(
    updates: Partial<NonNullable<MachineJudgeConfig["arithmeticBenchmarkConfig"]>>
  ) {
    updateConfig({
      arithmeticBenchmarkConfig: { ...benchmarkConfig, ...updates },
    });
  }

  function toggleOperator(op: '+' | '-' | '*' | '/') {
    const current = benchmarkConfig.operators;
    if (current.includes(op)) {
      if (current.length > 1) {
        updateBenchmarkConfig({ operators: current.filter(o => o !== op) });
      }
    } else {
      updateBenchmarkConfig({ operators: [...current, op] });
    }
  }

  function refreshPreview() {
    const cases = generatePreviewCases("arithmetic", {
      count: 3,
      operators: benchmarkConfig.operators,
      minOperand: benchmarkConfig.minOperand,
      maxOperand: benchmarkConfig.maxOperand,
      complexity: benchmarkConfig.complexity,
    }, 3);
    setPreviewCases(cases);
  }

  // Generate initial preview
  useState(() => {
    refreshPreview();
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/20 rounded">
        <Sparkles className="h-4 w-4 shrink-0 text-primary" />
        <span className="text-xs">
          Generates {benchmarkConfig.count} math problems and checks how many the model calculates correctly.
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Number of Test Cases</Label>
          <Input
            type="number"
            value={benchmarkConfig.count}
            onChange={(e) => updateBenchmarkConfig({ count: Math.max(1, Math.min(50, parseInt(e.target.value) || 10)) })}
            min={1}
            max={50}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">5-50 recommended</p>
        </div>

        <div className="space-y-2">
          <Label>Complexity</Label>
          <Select
            value={benchmarkConfig.complexity}
            onValueChange={(v) => updateBenchmarkConfig({ complexity: v as "simple" | "moderate" | "complex" })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="simple">Simple (2 + 3)</SelectItem>
              <SelectItem value="moderate">Moderate (2 + 3 × 4)</SelectItem>
              <SelectItem value="complex">Complex ((2 + 3) × 4)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Operators</Label>
        <div className="flex gap-2">
          {(["+", "-", "*", "/"] as const).map((op) => (
            <Button
              key={op}
              type="button"
              variant={benchmarkConfig.operators.includes(op) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleOperator(op)}
              disabled={disabled}
              className="w-10 font-mono text-lg"
            >
              {op === "*" ? "×" : op === "/" ? "÷" : op}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          At least one operator must be selected
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Min Operand Value</Label>
          <Input
            type="number"
            value={benchmarkConfig.minOperand}
            onChange={(e) => updateBenchmarkConfig({ minOperand: Math.max(1, Math.min(benchmarkConfig.maxOperand, parseInt(e.target.value) || 1)) })}
            min={1}
            max={benchmarkConfig.maxOperand}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label>Max Operand Value</Label>
          <Input
            type="number"
            value={benchmarkConfig.maxOperand}
            onChange={(e) => updateBenchmarkConfig({ maxOperand: Math.max(benchmarkConfig.minOperand, Math.min(9999, parseInt(e.target.value) || 99)) })}
            min={benchmarkConfig.minOperand}
            max={9999}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Pass Threshold: {benchmarkConfig.passThreshold}%</Label>
        <Slider
          value={[benchmarkConfig.passThreshold]}
          onValueChange={([v]) => updateBenchmarkConfig({ passThreshold: v })}
          min={0}
          max={100}
          step={5}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Model must correctly solve at least {benchmarkConfig.passThreshold}% of the {benchmarkConfig.count} problems to pass
        </p>
      </div>

      <div className="p-3 bg-muted rounded-md space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Preview examples:</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={refreshPreview}
            disabled={disabled}
            className="h-6 px-2"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
        <div className="space-y-1 font-mono text-sm">
          {previewCases.map((tc, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-muted-foreground">{tc.input} = ?</span>
              <span>→</span>
              <span className="text-green-600 dark:text-green-400">{tc.expected}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
