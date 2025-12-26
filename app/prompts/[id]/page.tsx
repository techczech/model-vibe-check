import { notFound } from "next/navigation";
import Link from "next/link";
import { getPrompt, getRuns } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Edit,
  Copy,
  Trash2,
  Play,
  Paperclip,
  FileText,
  Image,
  CheckCircle,
  Bot,
  User,
  GitCompare,
  MessageSquare,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

const methodIcons = {
  human: User,
  "llm-judge": Bot,
  machine: CheckCircle,
  pairwise: GitCompare,
};

const methodLabels = {
  human: "Human Rating",
  "llm-judge": "LLM Judge",
  machine: "Machine Check",
  pairwise: "Pairwise Comparison",
};

export default async function PromptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const prompt = await getPrompt(id);

  if (!prompt) {
    notFound();
  }

  // Get runs that include this prompt
  const allRuns = await getRuns();
  const relatedRuns = allRuns.filter((r) => r.promptIds.includes(prompt.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/prompts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{prompt.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{prompt.category}</Badge>
              {prompt.attachments.length > 0 && (
                <Badge variant="secondary">
                  <Paperclip className="h-3 w-3 mr-1" />
                  {prompt.attachments.length} attachment
                  {prompt.attachments.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/prompts/${prompt.id}/responses`}>
            <Button variant="outline">
              <MessageSquare className="h-4 w-4 mr-2" />
              Responses
            </Button>
          </Link>
          <Link href={`/runs/new?prompts=${prompt.id}`}>
            <Button>
              <Play className="h-4 w-4 mr-2" />
              Run
            </Button>
          </Link>
          <Link href={`/prompts/${prompt.id}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {prompt.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{prompt.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Prompt Content */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Prompt</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg overflow-x-auto">
                {prompt.content}
              </pre>
            </CardContent>
          </Card>

          {/* Expected Answer */}
          {prompt.expectedAnswer && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Expected Answer</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-sm bg-green-50 p-4 rounded-lg overflow-x-auto border border-green-200">
                  {prompt.expectedAnswer}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Attachments */}
          {prompt.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Attachments</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {prompt.attachments.map((att) => (
                    <li
                      key={att.id}
                      className="flex items-center gap-3 p-2 rounded border"
                    >
                      {att.type === "image" ? (
                        <Image className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {att.filename}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {att.mimeType}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Keywords */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Keywords</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {prompt.keywords.map((kw) => (
                  <Badge key={kw} variant="outline">
                    {kw}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Evaluation Config */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evaluation Methods</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {prompt.evaluationConfig.methods.map((method) => {
                const Icon = methodIcons[method];
                return (
                  <div
                    key={method}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{methodLabels[method]}</span>
                  </div>
                );
              })}

              {/* Machine Judge Details */}
              {prompt.evaluationConfig.machineJudge && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-xs font-medium mb-1">Machine Judge</p>
                  <p className="text-xs text-muted-foreground">
                    Type: {prompt.evaluationConfig.machineJudge.type}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Criteria: {prompt.evaluationConfig.machineJudge.criteria}
                  </p>
                </div>
              )}

              {/* LLM Judge Details */}
              {prompt.evaluationConfig.llmJudge?.criteria && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-xs font-medium mb-1">LLM Judge Criteria</p>
                  <p className="text-xs text-muted-foreground">
                    {prompt.evaluationConfig.llmJudge.criteria}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Related Runs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Run History</CardTitle>
            </CardHeader>
            <CardContent>
              {relatedRuns.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No runs yet for this prompt
                </p>
              ) : (
                <ul className="space-y-2">
                  {relatedRuns.slice(0, 5).map((run) => (
                    <li key={run.id}>
                      <Link
                        href={`/runs/${run.id}`}
                        className="block p-2 rounded border hover:bg-accent transition-colors"
                      >
                        <p className="text-sm font-medium">{run.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(run.createdAt)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(prompt.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{formatDate(prompt.updatedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID</span>
                <code className="text-xs bg-muted px-1 rounded">
                  {prompt.id}
                </code>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
