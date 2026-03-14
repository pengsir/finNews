import Link from "next/link";
import { AdminJobPoller } from "@/components/admin-job-poller";
import { formatMarketDate } from "@/lib/format";
import { formatScheduleLabel } from "@/server/automation/settings";
import { requireAdminAuth } from "@/server/admin/auth";
import { getAdminDashboardData } from "@/server/queries/admin-content";
import {
  activateAiConfigAction,
  clearRunningPipelineJobAction,
  deactivateAiConfigAction,
  deleteAiConfigAction,
  deleteNewsSourceAction,
  logoutAction,
  runPipelineAction,
  saveAutomationScheduleAction,
  saveAiConfigAction,
  saveNewsSourceAction,
  updateAdminPasswordAction
} from "@/app/admin/actions";

export const dynamic = "force-dynamic";

type AdminTab =
  | "overview"
  | "automation"
  | "ai"
  | "sources"
  | "analytics"
  | "security";

const tabOptions: Array<{ id: AdminTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "automation", label: "Automation" },
  { id: "ai", label: "AI Models" },
  { id: "sources", label: "Sources" },
  { id: "analytics", label: "Analytics" },
  { id: "security", label: "Security" }
];

function getActiveTab(value?: string): AdminTab {
  return tabOptions.some((tab: { id: AdminTab }) => tab.id === value) ? (value as AdminTab) : "overview";
}

function formatJobDuration(startedAt: Date | null, finishedAt: Date | null) {
  if (!startedAt || !finishedAt) {
    return "n/a";
  }

  const durationMs = finishedAt.getTime() - startedAt.getTime();

  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  return `${(durationMs / 1000).toFixed(1)} s`;
}

const adminDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Los_Angeles"
});

function formatAdminDateTime(date: Date | null) {
  return date ? adminDateTimeFormatter.format(date) : "n/a";
}

function formatTokensCell(
  totalTokens: number | null,
  promptTokens: number | null,
  completionTokens: number | null
) {
  if (!totalTokens && !promptTokens && !completionTokens) {
    return "n/a";
  }

  return `${totalTokens ?? "n/a"} (${promptTokens ?? "n/a"} / ${completionTokens ?? "n/a"})`;
}

interface AdminDashboardPageProps {
  searchParams?: Promise<{
    tab?: string;
    jobStatus?: string;
    jobProvider?: string;
    aiProvider?: string;
    sourceStatus?: string;
    sourceType?: string;
    jobOpen?: string;
    run?: string;
    dispatchedAt?: string;
    message?: string;
    schedule?: string;
  }>;
}

function withAdminParams(
  activeTab: AdminTab,
  nextParams: Record<string, string | undefined>
) {
  const search = new URLSearchParams();
  search.set("tab", activeTab);

  for (const [key, value] of Object.entries(nextParams)) {
    if (value) {
      search.set(key, value);
    }
  }

  return `/admin?${search.toString()}` as never;
}

export default async function AdminDashboardPage({
  searchParams
}: AdminDashboardPageProps) {
  await requireAdminAuth();

  const params = searchParams ? await searchParams : undefined;
  const activeTab = getActiveTab(params?.tab);
  const dashboardData = await getAdminDashboardData();
  const { adminUser, aiConfigs, sources, reports, recentFeedback, recentJobs, totals, automationSetting } =
    dashboardData;
  type AiConfig = (typeof aiConfigs)[number];
  type Source = (typeof sources)[number];
  type Job = (typeof recentJobs)[number];
  const jobStatusFilter = params?.jobStatus ?? "all";
  const jobProviderFilter = params?.jobProvider ?? "all";
  const aiProviderFilter = params?.aiProvider ?? "all";
  const sourceStatusFilter = params?.sourceStatus ?? "all";
  const sourceTypeFilter = params?.sourceType ?? "all";
  const openJobId = params?.jobOpen;
  const runStatus = params?.run;
  const dispatchedAt = params?.dispatchedAt;
  const runMessage = params?.message;
  const scheduleStatus = params?.schedule;
  const runningJob = recentJobs.find((job: Job) => job.status === "RUNNING") ?? null;
  const dispatchedAtMs =
    dispatchedAt && /^\d+$/.test(dispatchedAt)
      ? Number.parseInt(dispatchedAt, 10)
      : null;
  const latestAdminJob =
    dispatchedAtMs === null
      ? null
      : recentJobs.find(
          (job: Job) =>
            job.triggerSource === "ADMIN" &&
            job.createdAt.getTime() >= dispatchedAtMs
        ) ?? null;
  const derivedRunStatus =
    runStatus === "started" && latestAdminJob && latestAdminJob.status !== "RUNNING"
      ? latestAdminJob.status === "SUCCEEDED"
        ? "success"
        : latestAdminJob.status === "FAILED"
          ? "error"
          : runStatus
      : runStatus;
  const derivedRunMessage =
    derivedRunStatus === "error" && latestAdminJob?.message
      ? latestAdminJob.message
      : runMessage;
  const isDispatchPending =
    runStatus === "started" && !runningJob && !latestAdminJob;
  const isJobRunning = Boolean(runningJob);
  const isAutomationBusy = isJobRunning || isDispatchPending;
  const activeAiConfig = aiConfigs.find((config: AiConfig) => config.isActive) ?? null;
  const latestJob = recentJobs[0] ?? null;
  const filteredJobs = recentJobs.filter((job: Job) => {
    const statusPass = jobStatusFilter === "all" || job.status === jobStatusFilter;
    const providerPass =
      jobProviderFilter === "all" || (job.aiProvider ?? "unknown") === jobProviderFilter;

    return statusPass && providerPass;
  });
  const filteredAiConfigs = aiConfigs.filter((config: AiConfig) => {
    return aiProviderFilter === "all" || config.provider === aiProviderFilter;
  });
  const filteredSources = sources.filter((source: Source) => {
    const statusPass =
      sourceStatusFilter === "all" ||
      (sourceStatusFilter === "active" && source.isActive) ||
      (sourceStatusFilter === "inactive" && !source.isActive);
    const typePass = sourceTypeFilter === "all" || source.sourceType === sourceTypeFilter;

    return statusPass && typePass;
  });
  const jobProviders = Array.from(
    new Set(recentJobs.map((job: Job) => job.aiProvider).filter(Boolean))
  ) as string[];
  const aiProviders = Array.from(
    new Set(aiConfigs.map((config: AiConfig) => config.provider))
  ) as string[];
  const sourceTypes = Array.from(
    new Set(sources.map((source: Source) => source.sourceType))
  ) as string[];

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Admin</p>
        <h1>Operations dashboard.</h1>
        <p className="lede">
          Production controls for scheduled publishing, model switching, source
          coverage, and audience signals.
        </p>
        <div className="hero-meta">
          <span>{activeAiConfig?.label ?? "No active AI profile"}</span>
          <span>{sources.filter((source: Source) => source.isActive).length} active sources</span>
          <span>{totals.views} tracked report views</span>
          <span>{totals.feedback} reader feedback items</span>
        </div>
        <div className="hero-actions">
          <Link className="button-link button-link-secondary" href="/">
            Back to site
          </Link>
          <form action={logoutAction}>
            <button className="button-link" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </section>

      <section className="section-block">
        <div className="filter-row admin-tab-row">
          {tabOptions.map((tab: (typeof tabOptions)[number]) => (
            <Link
              className={`filter-chip ${activeTab === tab.id ? "filter-chip-active" : ""}`}
              href={`/admin?tab=${tab.id}`}
              key={tab.id}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </section>

      {activeTab === "overview" ? (
        <section className="section-block">
          <div className="section-heading">
            <p className="eyebrow">Overview</p>
            <h2>What the desk is running right now.</h2>
          </div>

          <div className="stack-list">
            <section className="feature-card admin-compact-panel">
              <div className="admin-micro-grid admin-micro-grid-overview admin-micro-grid-header admin-list-header-sticky">
                <span>Active AI</span>
                <span>Automation</span>
                <span>Latest pipeline</span>
                <span>Views</span>
                <span>Feedback</span>
                <span>Active sources</span>
              </div>
              <div className="admin-compact-row">
                <div className="admin-micro-grid admin-micro-grid-overview">
                  <span className="admin-cell-clamp" title={activeAiConfig?.label ?? "No active AI profile"}>
                    {activeAiConfig?.label ?? "No active AI profile"}
                  </span>
                  <span>Daily 9:00 ET</span>
                  <span>{latestJob?.status ?? "No runs"}</span>
                  <span>{totals.views}</span>
                  <span>{totals.feedback}</span>
                  <span>{sources.filter((source: Source) => source.isActive).length}</span>
                </div>
                <p className="admin-row-note">
                  Scheduled daily trigger: {formatScheduleLabel(automationSetting.scheduleHourEt, automationSetting.scheduleMinuteEt)}
                </p>
                {activeAiConfig ? (
                  <p className="admin-row-note admin-cell-clamp" title={`${activeAiConfig.provider} / ${activeAiConfig.model}`}>
                    {activeAiConfig.provider} / {activeAiConfig.model}
                  </p>
                ) : null}
              </div>
            </section>

            <section className="feature-card admin-compact-panel">
              <div className="admin-micro-grid admin-micro-grid-reports admin-micro-grid-header admin-list-header-sticky">
                <span>Date</span>
                <span>Title</span>
                <span>Views</span>
                <span>Feedback</span>
                <span>Open</span>
              </div>
              <div className="admin-compact-list">
                {reports.map((report: (typeof reports)[number]) => (
                  <article className="admin-compact-row" key={report.id}>
                    <div className="admin-micro-grid admin-micro-grid-reports">
                      <span>{formatMarketDate(report.marketDate)}</span>
                      <span className="admin-cell-clamp" title={report.title}>
                        {report.title}
                      </span>
                      <span>{report._count.pageViews}</span>
                      <span>{report._count.feedbackEntries}</span>
                      <Link className="inline-link" href={`/reports/${report.slug}`}>
                        Open
                      </Link>
                    </div>
                    <p className="admin-row-note admin-cell-clamp" title={report.summary}>
                      {report.summary}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </section>
      ) : null}

      {activeTab === "automation" ? (
        <section className="section-block">
          {isAutomationBusy ? <AdminJobPoller jobId={runningJob?.id} /> : null}
          <div className="section-heading">
            <p className="eyebrow">Automation</p>
            <h2>Trigger and monitor the daily generation pipeline.</h2>
          </div>

          <div className="stack-list">
            <article className="feature-card admin-toolbar-panel">
              <div className="admin-toolbar">
                <form action="/admin" className="admin-toolbar-filters">
                  <input name="tab" type="hidden" value="automation" />
                  <label className="admin-toolbar-field">
                    <span>Status</span>
                    <select defaultValue={jobStatusFilter} name="jobStatus">
                      <option value="all">All status</option>
                      <option value="SUCCEEDED">Succeeded</option>
                      <option value="FAILED">Failed</option>
                      <option value="RUNNING">Running</option>
                    </select>
                  </label>
                  <label className="admin-toolbar-field">
                    <span>Provider</span>
                    <select defaultValue={jobProviderFilter} name="jobProvider">
                      <option value="all">All providers</option>
                      {jobProviders.map((provider: string) => (
                        <option key={provider} value={provider ?? "unknown"}>
                          {provider}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="button-link button-link-secondary" type="submit">
                    Apply
                  </button>
                </form>

                <div className="admin-toolbar-actions">
                  <div className="admin-toolbar-note">
                    <strong>Schedule:</strong> checked every hour, runs at {formatScheduleLabel(automationSetting.scheduleHourEt, automationSetting.scheduleMinuteEt)}
                  </div>
                  {isAutomationBusy ? (
                    <form action={clearRunningPipelineJobAction}>
                      <button className="button-link button-link-secondary" type="submit">
                        Clear running job
                      </button>
                    </form>
                  ) : null}
                  <form action={runPipelineAction}>
                    <button className="button-link" disabled={isAutomationBusy} type="submit">
                      {isJobRunning ? "Running..." : isDispatchPending ? "Dispatching..." : "Run now"}
                    </button>
                  </form>
                </div>
              </div>
              {isJobRunning ? (
                <p className="admin-form-error">
                  A pipeline job started at {formatAdminDateTime(runningJob?.startedAt ?? runningJob?.createdAt ?? null)} is still running.
                </p>
              ) : null}
              {isDispatchPending ? (
                <p className="admin-form-success">
                  Manual pipeline run dispatched to GitHub Actions. Waiting for the runner to pick it up.
                </p>
              ) : null}
              {derivedRunStatus === "started" ? (
                <p className="admin-form-success">
                  {derivedRunMessage ?? "Manual pipeline run has been queued for GitHub Actions."}
                </p>
              ) : null}
              {runStatus === "cleared" ? (
                <p className="admin-form-success">Running pipeline job cleared.</p>
              ) : null}
              {scheduleStatus === "updated" ? (
                <p className="admin-form-success">
                  Scheduled trigger updated to {formatScheduleLabel(automationSetting.scheduleHourEt, automationSetting.scheduleMinuteEt)}.
                </p>
              ) : null}
              {derivedRunStatus === "success" ? (
                <p className="admin-form-success">Manual pipeline run completed successfully.</p>
              ) : null}
              {derivedRunStatus === "error" ? (
                <p className="admin-form-error">{derivedRunMessage ?? "Manual pipeline run failed."}</p>
              ) : null}
            </article>

            <article className="feature-card admin-toolbar-panel">
              <p className="eyebrow">Scheduled trigger</p>
              <form action={saveAutomationScheduleAction} className="admin-form admin-form-compact">
                <div className="admin-inline-form-grid admin-inline-form-grid-schedule">
                  <label className="admin-field admin-field-compact">
                    <span>Hour (ET)</span>
                    <input
                      defaultValue={automationSetting.scheduleHourEt}
                      max="23"
                      min="0"
                      name="scheduleHourEt"
                      required
                      type="number"
                    />
                  </label>
                  <label className="admin-field admin-field-compact">
                    <span>Minute</span>
                    <input
                      defaultValue={automationSetting.scheduleMinuteEt}
                      max="59"
                      min="0"
                      name="scheduleMinuteEt"
                      required
                      type="number"
                    />
                  </label>
                  <div className="admin-inline-actions admin-inline-actions-table">
                    <button className="button-link" type="submit">
                      Save schedule
                    </button>
                  </div>
                </div>
              </form>
            </article>

            <section className="feature-card admin-compact-panel">
              <div className="admin-table-scroll">
                <div className="admin-micro-grid admin-micro-grid-jobs-collapsed admin-micro-grid-header admin-list-header-sticky">
                  <span>Status</span>
                  <span>Started</span>
                  <span>Model</span>
                  <span>Details</span>
                </div>
                <div className="admin-compact-list admin-compact-list-tight">
                {filteredJobs.length === 0 ? (
                  <p className="muted-copy">No pipeline runs recorded yet.</p>
                ) : (
                  filteredJobs.map((job: Job) => (
                    <article className="admin-table-row" key={job.id}>
                      <div className="admin-micro-grid admin-micro-grid-jobs-collapsed">
                        <span className={`admin-status-badge admin-status-${job.status.toLowerCase()}`}>
                          {job.status}
                        </span>
                        <span>{formatAdminDateTime(job.startedAt ?? job.createdAt)}</span>
                        <span
                          className="admin-cell-clamp"
                          title={`${job.aiProvider ?? "unknown"} / ${job.aiModel ?? "unknown model"}`}
                        >
                          {job.aiProvider ?? "unknown"} / {job.aiModel ?? "unknown model"}
                        </span>
                        <Link
                          className="inline-link"
                          href={withAdminParams("automation", {
                            jobStatus: jobStatusFilter === "all" ? undefined : jobStatusFilter,
                            jobProvider: jobProviderFilter === "all" ? undefined : jobProviderFilter,
                            jobOpen: openJobId === job.id ? undefined : job.id
                          })}
                        >
                          {openJobId === job.id ? "Collapse" : "Expand"}
                        </Link>
                      </div>
                      {openJobId === job.id ? (
                        <div className="admin-row-detail admin-row-detail-expanded">
                          <div className="admin-micro-grid admin-micro-grid-job-details admin-micro-grid-header">
                            <span>Trigger</span>
                            <span>Duration</span>
                            <span>Tokens</span>
                            <span>Report</span>
                          </div>
                          <div className="admin-micro-grid admin-micro-grid-job-details">
                            <span>{job.triggerSource ?? "SYSTEM"}</span>
                            <span>{formatJobDuration(job.startedAt, job.finishedAt)}</span>
                            <span title={formatTokensCell(job.totalTokens, job.promptTokens, job.completionTokens)}>
                              {formatTokensCell(job.totalTokens, job.promptTokens, job.completionTokens)}
                            </span>
                            <span className="admin-cell-clamp" title={job.reportSlug ?? "-"}>
                              {job.reportSlug ?? "-"}
                            </span>
                          </div>
                          <p className="admin-row-note" title={job.message ?? "No message."}>
                            {job.message ?? "No message."}
                          </p>
                        </div>
                      ) : null}
                    </article>
                  ))
                )}
                </div>
              </div>
            </section>
          </div>
        </section>
      ) : null}

      {activeTab === "ai" ? (
        <section className="section-block">
          <div className="section-heading">
            <p className="eyebrow">AI profiles</p>
            <h2>Switch the model that generates the next published brief.</h2>
          </div>

          <div className="stack-list">
            {isJobRunning ? (
              <article className="feature-card admin-toolbar-panel">
                <p className="admin-form-error">
                  AI profiles are locked while a pipeline job is running.
                </p>
              </article>
            ) : null}
            <article className="feature-card admin-toolbar-panel">
              <div className="admin-toolbar">
                <form action="/admin" className="admin-toolbar-filters">
                  <input name="tab" type="hidden" value="ai" />
                  <label className="admin-toolbar-field">
                    <span>Provider</span>
                    <select defaultValue={aiProviderFilter} name="aiProvider">
                      <option value="all">All providers</option>
                      {aiProviders.map((provider: string) => (
                        <option key={provider} value={provider}>
                          {provider}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="button-link button-link-secondary" type="submit">
                    Apply
                  </button>
                </form>
              </div>
            </article>

            <div className="feature-card admin-compact-panel">
              <div className="admin-table-scroll">
                <div className="admin-micro-grid admin-micro-grid-ai admin-micro-grid-header admin-list-header-sticky">
                  <span>Provider</span>
                  <span>Model</span>
                  <span>Endpoint</span>
                  <span>Auth</span>
                  <span>Actions</span>
                </div>
                <div className="admin-compact-list admin-compact-list-tight">
            {filteredAiConfigs.map((config: AiConfig) => (
              <article
                className={`admin-table-row ${config.isActive ? "admin-table-row-active" : ""}`}
                key={config.id}
              >
                <form action={saveAiConfigAction} className="admin-form admin-form-compact">
                  <input name="id" type="hidden" value={config.id} />
                  <input name="label" type="hidden" value={config.label} />
                  <input name="activate" type="hidden" value={config.isActive ? "true" : "false"} />
                  <fieldset className="admin-form-fieldset" disabled={isJobRunning}>
                  <div className="admin-inline-form-grid admin-inline-form-grid-ai-table">
                    <label className="admin-field admin-field-compact">
                      <select defaultValue={config.provider} name="provider">
                        <option value="gemini">Gemini</option>
                        <option value="ollama">Ollama</option>
                        <option value="openai-compatible">OpenAI-compatible</option>
                        <option value="mock">Mock</option>
                      </select>
                    </label>
                    <label className="admin-field admin-field-compact">
                      <input defaultValue={config.model} name="model" required type="text" />
                    </label>
                    <label className="admin-field admin-field-compact">
                      <input defaultValue={config.baseUrl} name="baseUrl" required title={config.baseUrl} type="url" />
                    </label>
                    <label className="admin-field admin-field-compact">
                      <input
                        defaultValue={config.apiKey ?? ""}
                        name="apiKey"
                        placeholder={config.apiKey ? "Update key" : "No key"}
                        type="password"
                      />
                    </label>
                    <div className="admin-inline-actions admin-inline-actions-table">
                      <button className="button-link button-link-secondary" type="submit">
                        Save
                      </button>
                      {config.isActive ? (
                        <button
                          className="button-link button-link-secondary"
                          disabled={isJobRunning}
                          formAction={deactivateAiConfigAction}
                          type="submit"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button className="button-link" disabled={isJobRunning} formAction={activateAiConfigAction} type="submit">
                          Activate
                        </button>
                      )}
                      <button
                        className="button-link button-link-secondary"
                        disabled={isJobRunning}
                        formAction={deleteAiConfigAction}
                        type="submit"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  </fieldset>
                </form>
              </article>
            ))}
                </div>
              </div>
            </div>

            <article className="feature-card admin-toolbar-panel">
              <p className="eyebrow">New AI profile</p>
              <form action={saveAiConfigAction} className="admin-form admin-form-compact">
                <input name="label" type="hidden" value="" />
                <fieldset className="admin-form-fieldset" disabled={isJobRunning}>
                <div className="admin-inline-form-grid admin-inline-form-grid-ai-table">
                  <label className="admin-field admin-field-compact">
                    <select defaultValue="gemini" name="provider">
                      <option value="gemini">Gemini</option>
                      <option value="ollama">Ollama</option>
                      <option value="openai-compatible">OpenAI-compatible</option>
                      <option value="mock">Mock</option>
                    </select>
                  </label>
                  <label className="admin-field admin-field-compact">
                    <input name="model" placeholder="gemini-2.5-pro" required type="text" />
                  </label>
                  <label className="admin-field admin-field-compact">
                    <input
                      defaultValue="https://generativelanguage.googleapis.com/v1beta"
                      name="baseUrl"
                      required
                      type="url"
                    />
                  </label>
                  <label className="admin-field admin-field-compact">
                    <input name="apiKey" placeholder="Optional key" type="password" />
                  </label>
                  <label className="admin-checkbox admin-checkbox-compact admin-status-toggle">
                    <input defaultChecked name="activate" type="checkbox" />
                    <span>Set active</span>
                  </label>
                  <div className="admin-inline-actions admin-inline-actions-table">
                    <button className="button-link" disabled={isJobRunning} type="submit">
                      Create
                    </button>
                  </div>
                </div>
                </fieldset>
              </form>
            </article>
          </div>
        </section>
      ) : null}

      {activeTab === "sources" ? (
        <section className="section-block">
          <div className="section-heading">
            <p className="eyebrow">Sources</p>
            <h2>Manage the live news feeds ranked into the top 20 pipeline.</h2>
          </div>

          <div className="stack-list">
            {isJobRunning ? (
              <article className="feature-card admin-toolbar-panel">
                <p className="admin-form-error">
                  Sources are locked while a pipeline job is running.
                </p>
              </article>
            ) : null}
            <article className="feature-card admin-toolbar-panel">
              <div className="admin-toolbar">
                <form action="/admin" className="admin-toolbar-filters">
                  <input name="tab" type="hidden" value="sources" />
                  <label className="admin-toolbar-field">
                    <span>Status</span>
                    <select defaultValue={sourceStatusFilter} name="sourceStatus">
                      <option value="all">All status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </label>
                  <label className="admin-toolbar-field">
                    <span>Type</span>
                    <select defaultValue={sourceTypeFilter} name="sourceType">
                      <option value="all">All types</option>
                      {sourceTypes.map((type: string) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="button-link button-link-secondary" type="submit">
                    Apply
                  </button>
                </form>
              </div>
            </article>

            <div className="feature-card admin-compact-panel">
              <div className="admin-table-scroll">
                <div className="admin-micro-grid admin-micro-grid-sources admin-micro-grid-header admin-list-header-sticky">
                  <span>Name</span>
                  <span>Slug</span>
                  <span>Type</span>
                  <span>Weight</span>
                  <span>Feed URL</span>
                  <span>Live</span>
                  <span>Actions</span>
                </div>
                <div className="admin-compact-list admin-compact-list-tight">
            {filteredSources.map((source: Source) => (
              <article className="admin-table-row" key={source.id}>
                <form action={saveNewsSourceAction} className="admin-form admin-form-compact">
                  <input name="id" type="hidden" value={source.id} />
                  <fieldset className="admin-form-fieldset" disabled={isJobRunning}>
                  <div className="admin-inline-form-grid admin-inline-form-grid-sources-table">
                    <label className="admin-field admin-field-compact">
                      <input defaultValue={source.name} name="name" required type="text" />
                    </label>
                    <label className="admin-field admin-field-compact">
                      <input defaultValue={source.slug} name="slug" required type="text" />
                    </label>
                    <label className="admin-field admin-field-compact">
                      <input defaultValue={source.sourceType} name="sourceType" required type="text" />
                    </label>
                    <label className="admin-field admin-field-compact">
                      <input
                        defaultValue={source.weight.toString()}
                        name="weight"
                        required
                        step="0.05"
                        type="number"
                      />
                    </label>
                    <label className="admin-field admin-field-compact">
                      <input defaultValue={source.feedUrl} name="feedUrl" required title={source.feedUrl} type="url" />
                    </label>
                    <label className="admin-checkbox admin-checkbox-compact">
                      <input defaultChecked={source.isActive} name="isActive" type="checkbox" />
                      <span>Live</span>
                    </label>
                    <div className="admin-inline-actions admin-inline-actions-table">
                      <button className="button-link button-link-secondary" type="submit">
                        Save
                      </button>
                      <button className="button-link" disabled={isJobRunning} formAction={deleteNewsSourceAction} type="submit">
                        Delete
                      </button>
                    </div>
                  </div>
                  </fieldset>
                </form>
              </article>
            ))}
                </div>
              </div>
            </div>

            <article className="feature-card admin-toolbar-panel">
              <p className="eyebrow">New source</p>
              <form action={saveNewsSourceAction} className="admin-form admin-form-compact">
                <fieldset className="admin-form-fieldset" disabled={isJobRunning}>
                <div className="admin-inline-form-grid admin-inline-form-grid-sources-table">
                  <label className="admin-field admin-field-compact">
                    <input name="name" placeholder="Barron's Markets" required type="text" />
                  </label>
                  <label className="admin-field admin-field-compact">
                    <input name="slug" placeholder="barrons-markets" required type="text" />
                  </label>
                  <label className="admin-field admin-field-compact">
                    <input defaultValue="rss" name="sourceType" required type="text" />
                  </label>
                  <label className="admin-field admin-field-compact">
                    <input
                      defaultValue="1"
                      name="weight"
                      required
                      step="0.05"
                      type="number"
                    />
                  </label>
                  <label className="admin-field admin-field-compact">
                    <input name="feedUrl" required type="url" />
                  </label>
                  <label className="admin-checkbox admin-checkbox-compact">
                    <input defaultChecked name="isActive" type="checkbox" />
                    <span>Live</span>
                  </label>
                  <div className="admin-inline-actions admin-inline-actions-table">
                    <button className="button-link" disabled={isJobRunning} type="submit">
                      Create
                    </button>
                  </div>
                </div>
                </fieldset>
              </form>
            </article>
          </div>
        </section>
      ) : null}

      {activeTab === "analytics" ? (
        <section className="section-block">
          <div className="section-heading">
            <p className="eyebrow">Analytics</p>
            <h2>Reading activity and audience sentiment.</h2>
          </div>

          <div className="stack-list">
            <section className="feature-card admin-compact-panel">
              <div className="admin-micro-grid admin-micro-grid-overview admin-micro-grid-header admin-list-header-sticky">
                <span>Total views</span>
                <span>Total feedback</span>
                <span>Total unlikes</span>
                <span>Latest report</span>
                <span>Latest report views</span>
                <span>Latest report feedback</span>
              </div>
              <div className="admin-compact-row">
                <div className="admin-micro-grid admin-micro-grid-overview">
                  <span>{totals.views}</span>
                  <span>{totals.feedback}</span>
                  <span>{totals.unlikes}</span>
                  <span className="admin-cell-clamp" title={reports[0]?.title ?? "-"}>
                    {reports[0]?.title ?? "-"}
                  </span>
                  <span>{reports[0]?._count.pageViews ?? 0}</span>
                  <span>{reports[0]?._count.feedbackEntries ?? 0}</span>
                </div>
              </div>
            </section>

            <section className="feature-card admin-compact-panel">
              <div className="admin-micro-grid admin-micro-grid-feedback admin-micro-grid-header admin-list-header-sticky">
                <span>Reaction</span>
                <span>Report</span>
                <span>Created</span>
                <span>Reason</span>
              </div>
              <div className="admin-compact-list">
                {recentFeedback.length === 0 ? (
                  <p className="muted-copy">No reader feedback yet.</p>
                ) : (
                  recentFeedback.map((entry: (typeof recentFeedback)[number]) => (
                    <article className="admin-compact-row" key={entry.id}>
                      <div className="admin-micro-grid admin-micro-grid-feedback">
                        <strong>{entry.reaction}</strong>
                        <span className="admin-cell-clamp" title={entry.report.title}>
                          {entry.report.title}
                        </span>
                        <span>{entry.createdAt.toLocaleString()}</span>
                        <span className="admin-cell-clamp" title={entry.reason ?? "Positive reaction with no comment."}>
                          {entry.reason ?? "Positive reaction with no comment."}
                        </span>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        </section>
      ) : null}

      {activeTab === "security" ? (
        <section className="section-block">
          <div className="section-heading">
            <p className="eyebrow">Security</p>
            <h2>Update the admin login password.</h2>
          </div>

          <div className="content-grid admin-dashboard-grid">
            <article className="feature-card">
              <p className="eyebrow">Admin account</p>
              <p className="muted-copy">
                Current username: <strong>{adminUser?.username ?? "admin"}</strong>
              </p>
              <form action={updateAdminPasswordAction} className="admin-form">
                <div className="admin-form-grid">
                  <label className="admin-field">
                    <span>Current password</span>
                    <input name="currentPassword" required type="password" />
                  </label>
                  <label className="admin-field">
                    <span>New password</span>
                    <input name="nextPassword" required type="password" />
                  </label>
                  <label className="admin-field admin-field-wide">
                    <span>Confirm new password</span>
                    <input name="confirmPassword" required type="password" />
                  </label>
                </div>
                <div className="admin-actions-row">
                  <button className="button-link" type="submit">
                    Update password
                  </button>
                </div>
              </form>
            </article>

            <aside className="detail-panel">
              <div className="detail-card">
                <p className="eyebrow">Notes</p>
                <div className="detail-list">
                  <p>Passwords are now stored in the database as scrypt hashes.</p>
                  <p>Existing sessions remain valid until sign-out or expiry.</p>
                  <p>Use at least 8 characters for the new password.</p>
                </div>
              </div>
            </aside>
          </div>
        </section>
      ) : null}
    </main>
  );
}
