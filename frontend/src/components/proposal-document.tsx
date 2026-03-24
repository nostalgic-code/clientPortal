'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FileText, CheckCircle2, AlertCircle, Calendar, DollarSign } from 'lucide-react';

interface ProposalDocumentProps {
  content: string;
  clientName?: string;
  totalAmount?: number;
  currency?: string;
  status?: 'draft' | 'sent' | 'accepted' | 'rejected';
  createdAt?: string;
  /** Show accept/decline buttons for the client-facing view */
  showActions?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
  isAccepting?: boolean;
  isRejecting?: boolean;
}

export function ProposalDocument({
  content,
  clientName,
  totalAmount,
  currency = 'R',
  status,
  createdAt,
  showActions = false,
  onAccept,
  onReject,
  isAccepting = false,
  isRejecting = false,
}: ProposalDocumentProps) {
  return (
    <div className="max-w-[820px] mx-auto">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-slate-900 leading-tight">
            {clientName ? `Proposal for ${clientName}` : 'Project Proposal'}
          </h1>
          {createdAt && (
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3" />
              {new Date(createdAt).toLocaleDateString('en-ZA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
        </div>
      </div>

      {/* Status Banners */}
      {status === 'accepted' && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-medium text-emerald-800">This proposal has been accepted</span>
        </div>
      )}
      {status === 'rejected' && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span className="text-sm font-medium text-red-800">This proposal has been declined</span>
        </div>
      )}

      {/* Document Card */}
      <Card className="shadow-xl border-0 overflow-hidden">
        {/* Investment Bar */}
        {totalAmount != null && totalAmount > 0 && (
          <div className="bg-slate-900 px-8 py-5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-widest">Total Investment</span>
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">
              {currency}{totalAmount.toLocaleString()}
            </span>
          </div>
        )}

        {/* Markdown Body */}
        <CardContent className="px-8 py-10 sm:px-10 md:px-14 lg:px-16">
          <article className="proposal-markdown">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-[1.75rem] leading-tight font-bold text-slate-900 mt-12 mb-5 first:mt-0 tracking-tight border-b border-slate-100 pb-3">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-[1.35rem] leading-snug font-semibold text-slate-800 mt-10 mb-3 tracking-tight">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-base font-semibold text-slate-700 mt-6 mb-2">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-[0.935rem] text-slate-600 leading-[1.75] mb-4">
                    {children}
                  </p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-slate-800">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="text-slate-500">{children}</em>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc ml-5 mb-5 space-y-2 text-[0.935rem] text-slate-600 leading-relaxed">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal ml-5 mb-5 space-y-2 text-[0.935rem] text-slate-600 leading-relaxed">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="pl-1">{children}</li>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="relative border-l-[3px] border-slate-800 bg-slate-50 pl-5 pr-5 py-4 my-6 rounded-r-lg text-[0.935rem]">
                    <div className="text-slate-600 italic leading-relaxed [&>p]:mb-1 [&>p:last-child]:mb-0">
                      {children}
                    </div>
                  </blockquote>
                ),
                hr: () => (
                  <div className="my-10 flex items-center gap-4">
                    <div className="flex-1 h-px bg-slate-200" />
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-6 rounded-xl border border-slate-200 shadow-sm">
                    <table className="w-full text-sm">{children}</table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-slate-50 border-b border-slate-200">
                    {children}
                  </thead>
                ),
                tbody: ({ children }) => (
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {children}
                  </tbody>
                ),
                tr: ({ children }) => (
                  <tr className="transition-colors hover:bg-slate-50/60">
                    {children}
                  </tr>
                ),
                th: ({ children }) => (
                  <th className="px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-wider text-slate-500">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-4 py-3 text-slate-600 text-[0.875rem]">
                    {children}
                  </td>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className="text-slate-900 underline underline-offset-2 decoration-slate-300 hover:decoration-slate-800 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
                code: ({ children }) => (
                  <code className="bg-slate-100 text-slate-700 text-[0.8rem] px-1.5 py-0.5 rounded font-mono">
                    {children}
                  </code>
                ),
              }}
            >
              {content || '*No content available*'}
            </ReactMarkdown>
          </article>
        </CardContent>

        {/* Accept / Decline Actions */}
        {showActions && status === 'sent' && (
          <>
            <Separator />
            <CardFooter className="px-8 py-6 sm:px-10 md:px-14 lg:px-16 bg-slate-50/60">
              <div className="w-full space-y-3">
                <p className="text-sm text-slate-500 text-center mb-4">
                  Please review the proposal above and respond below
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    className="flex-1 h-12 text-base font-medium"
                    onClick={onAccept}
                    disabled={isAccepting || isRejecting}
                  >
                    {isAccepting ? 'Processing...' : 'Accept Proposal'}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-12 text-base font-medium"
                    onClick={onReject}
                    disabled={isAccepting || isRejecting}
                  >
                    {isRejecting ? 'Processing...' : 'Decline'}
                  </Button>
                </div>
              </div>
            </CardFooter>
          </>
        )}

        {/* Draft indicator for preview mode */}
        {!showActions && status === 'draft' && (
          <>
            <Separator />
            <CardFooter className="px-8 py-6 sm:px-10 md:px-14 lg:px-16 bg-slate-50/60">
              <div className="w-full text-center space-y-2">
                <div className="inline-flex items-center gap-2 text-sm text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  Draft — Accept & Decline buttons will appear here for the client
                </div>
              </div>
            </CardFooter>
          </>
        )}
      </Card>

      {/* Document Footer */}
      <div className="mt-4 flex items-center justify-between text-[0.7rem] text-slate-400 px-2">
        <span>Generated via Client Portal</span>
        {createdAt && (
          <span>
            {new Date(createdAt).toLocaleDateString('en-ZA', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        )}
      </div>
    </div>
  );
}
