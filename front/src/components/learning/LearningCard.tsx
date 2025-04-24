'use client';

import { motion } from 'framer-motion';
import { Info, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LearningCardProps {
  theme: string;
  niveau: string;
  info: string;
  reference: string;
  className?: string;
}

export function LearningCard({ theme, niveau, info, reference, className }: LearningCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'group relative overflow-hidden rounded-lg border bg-white p-6 shadow-sm transition-all hover:shadow-md',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-gray-900">{theme}</h3>
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
            {niveau}
          </span>
        </div>
        <div className="rounded-full bg-blue-100 p-2">
          <Info className="h-5 w-5 text-blue-600" />
        </div>
      </div>

      <div className="mt-4">
        <p className="text-sm text-gray-600">{info}</p>
      </div>

      {reference && (
        <div className="mt-4 flex items-center text-sm text-gray-500">
          <BookOpen className="mr-2 h-4 w-4" />
          <span>{reference}</span>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-blue-50/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
    </motion.div>
  );
} 