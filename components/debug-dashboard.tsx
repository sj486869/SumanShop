'use client'

/**
 * Debug Dashboard Component
 * 
 * Features:
 * - Real-time error monitoring
 * - Performance metrics visualization
 * - Log export functionality
 * - Interactive error filtering
 * - Development-only visibility
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  AlertTriangle, 
  Activity, 
  Download, 
  RefreshCw, 
  Clock, 
  Database,
  Bug,
  TrendingUp,
  Filter,
  Eye,
  Trash2
} from 'lucide-react'
import { useSupabaseDebugger } from '@/lib/debug/supabase-debugger'
import { toast } from 'sonner'

interface DebugDashboardProps {
  className?: string
  showOnlyInDevelopment?: boolean
}

export function DebugDashboard({ 
  className = '',
  showOnlyInDevelopment = true 
}: DebugDashboardProps) {
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [filterLevel, setFilterLevel] = useState<'all' | 'error' | 'warning'>('all')
  
  const debugger = useSupabaseDebugger()
  const [errorLogs, setErrorLogs] = useState(debugger.getErrorLogs())
  const [performanceLogs, setPerformanceLogs] = useState(debugger.getPerformanceLogs())

  // Hide in production unless explicitly shown
  if (showOnlyInDevelopment && process.env.NODE_ENV === 'production') {
    return null
  }

  // Auto refresh logs every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setErrorLogs(debugger.getErrorLogs())
      setPerformanceLogs(debugger.getPerformanceLogs())
      setLastRefresh(new Date())
    }, 2000)

    setRefreshInterval(interval)

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [debugger])

  const handleExportLogs = async () => {
    try {
      const logs = debugger.exportLogs()
      const dataStr = JSON.stringify(logs, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      
      // Create download link
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `supabase-debug-logs-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast.success('Debug logs exported successfully!')
    } catch (error) {
      toast.error('Failed to export logs')
      console.error('Export error:', error)
    }
  }

  const handleClearLogs = () => {
    debugger.clearLogs()
    setErrorLogs([])
    setPerformanceLogs([])
    toast.success('Debug logs cleared')
  }

  const formatTimestamp = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
    return date.toLocaleTimeString()
  }

  const getPerformanceColor = (duration: number) => {
    if (duration > 1000) return 'text-red-500'
    if (duration > 500) return 'text-yellow-500'
    return 'text-green-500'
  }

  const getPerformanceStats = () => {
    if (performanceLogs.length === 0) return { avg: 0, max: 0, min: 0, total: performanceLogs.length }
    
    const durations = performanceLogs.map(log => log.duration)
    return {
      avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      max: Math.max(...durations),
      min: Math.min(...durations),
      total: performanceLogs.length
    }
  }

  const stats = getPerformanceStats()
  const recentErrors = errorLogs.slice(-5)
  const slowOperations = performanceLogs.filter(log => log.duration > 500).slice(-5)

  return (
    <div className={`fixed bottom-4 right-4 w-96 max-h-[600px] z-50 ${className}`}>
      <Card className="shadow-lg border-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">Debug Dashboard</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">
                {process.env.NODE_ENV}
              </Badge>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => {
                  setErrorLogs(debugger.getErrorLogs())
                  setPerformanceLogs(debugger.getPerformanceLogs())
                  setLastRefresh(new Date())
                }}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <CardDescription className="text-xs flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Last updated: {formatTimestamp(lastRefresh)}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-2">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-2">
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="errors" className="text-xs">Errors</TabsTrigger>
              <TabsTrigger value="performance" className="text-xs">Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-2 m-0">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded">
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                    <span className="text-xs font-medium">Errors</span>
                  </div>
                  <p className="text-lg font-bold text-red-600">{errorLogs.length}</p>
                </div>
                
                <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                  <div className="flex items-center gap-1">
                    <Database className="h-3 w-3 text-blue-500" />
                    <span className="text-xs font-medium">Operations</span>
                  </div>
                  <p className="text-lg font-bold text-blue-600">{stats.total}</p>
                </div>
              </div>

              {/* Performance Summary */}
              {stats.total > 0 && (
                <div className="p-2 bg-muted/50 rounded">
                  <h4 className="text-xs font-medium mb-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Performance Summary
                  </h4>
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    <div>Avg: <span className={getPerformanceColor(stats.avg)}>{stats.avg}ms</span></div>
                    <div>Max: <span className={getPerformanceColor(stats.max)}>{stats.max}ms</span></div>
                    <div>Min: <span className={getPerformanceColor(stats.min)}>{stats.min}ms</span></div>
                  </div>
                </div>
              )}

              {/* Recent Errors */}
              {recentErrors.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-xs font-medium flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                    Recent Errors
                  </h4>
                  <ScrollArea className="h-24">
                    <div className="space-y-1">
                      {recentErrors.map((log, index) => (
                        <div key={index} className="p-1 bg-red-50 dark:bg-red-950/20 rounded text-xs">
                          <div className="font-mono text-red-600">
                            {log.context.component}.{log.context.function}
                          </div>
                          <div className="text-muted-foreground truncate">
                            {log.error.message}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Slow Operations */}
              {slowOperations.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-xs font-medium flex items-center gap-1">
                    <Activity className="h-3 w-3 text-yellow-500" />
                    Slow Operations
                  </h4>
                  <ScrollArea className="h-24">
                    <div className="space-y-1">
                      {slowOperations.map((log, index) => (
                        <div key={index} className="p-1 bg-yellow-50 dark:bg-yellow-950/20 rounded text-xs">
                          <div className="font-mono">{log.operation}</div>
                          <div className={`${getPerformanceColor(log.duration)}`}>
                            {Math.round(log.duration)}ms
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </TabsContent>

            <TabsContent value="errors" className="space-y-2 m-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium">Error Log ({errorLogs.length})</h4>
                <Button size="sm" variant="ghost" onClick={handleClearLogs}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              
              <ScrollArea className="h-64">
                {errorLogs.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground py-8">
                    No errors recorded
                  </div>
                ) : (
                  <div className="space-y-2">
                    {errorLogs.slice().reverse().map((log, index) => (
                      <div key={index} className="p-2 bg-red-50 dark:bg-red-950/20 rounded border">
                        <div className="flex items-start justify-between mb-1">
                          <div className="font-mono text-xs text-red-600">
                            {log.context.component}.{log.context.function}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatTimestamp(log.context.timestamp)}
                          </div>
                        </div>
                        
                        <div className="text-xs text-red-700 dark:text-red-300 mb-1">
                          {log.error.message}
                        </div>
                        
                        {log.context.parameters && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              Parameters
                            </summary>
                            <pre className="text-xs mt-1 p-1 bg-muted rounded overflow-auto">
                              {JSON.stringify(log.context.parameters, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="performance" className="space-y-2 m-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium">Performance Log ({performanceLogs.length})</h4>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs">
                    Avg: {stats.avg}ms
                  </Badge>
                </div>
              </div>
              
              <ScrollArea className="h-64">
                {performanceLogs.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground py-8">
                    No operations recorded
                  </div>
                ) : (
                  <div className="space-y-1">
                    {performanceLogs.slice().reverse().map((log, index) => (
                      <div key={index} className="p-2 bg-muted/50 rounded border">
                        <div className="flex items-center justify-between">
                          <div className="font-mono text-xs">
                            {log.operation}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={log.duration > 1000 ? 'destructive' : log.duration > 500 ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {Math.round(log.duration)}ms
                            </Badge>
                            <div className="text-xs text-muted-foreground">
                              {formatTimestamp(log.context.timestamp)}
                            </div>
                          </div>
                        </div>
                        
                        {log.context.parameters && (
                          <details className="text-xs mt-1">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              Details
                            </summary>
                            <pre className="text-xs mt-1 p-1 bg-muted rounded overflow-auto">
                              {JSON.stringify(log.context.parameters, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 mt-2 pt-2 border-t">
            <Button size="sm" variant="outline" onClick={handleExportLogs} className="flex-1">
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
            <Button size="sm" variant="outline" onClick={handleClearLogs} className="flex-1">
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default DebugDashboard