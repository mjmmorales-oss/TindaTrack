import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { aiService } from '@/services/ai'
import { notify } from '@/lib/notify'
import { downloadCsvText } from '@/lib/toCsv'
import i18n from '@/i18n'

export const aiLabKeys = {
  all: ['ai-lab'],
  metrics: (params) => ['ai-lab', 'metrics', params],
  experiments: () => ['ai-lab', 'experiments'],
  experiment: (id) => ['ai-lab', 'experiments', String(id)],
}

export function useAiMetrics(params = {}) {
  return useQuery({
    queryKey: aiLabKeys.metrics(params),
    queryFn: () => aiService.getMetrics(params),
  })
}

export function useExportAiMetrics() {
  return useMutation({
    mutationFn: async (params = {}) => {
      const csv = await aiService.exportMetricsCsv(params)
      downloadCsvText(csv, 'tindatrack-ai-metrics.csv')
      return csv
    },
    onSuccess: () => {
      notify.success(i18n.t('aiLab:exportMetricsSuccess', 'Metrics CSV downloaded'))
    },
    onError: (err) => {
      notify.error(err.message || i18n.t('aiLab:exportMetricsError', 'Failed to export metrics'))
    },
  })
}

export function useAiExperiments() {
  return useQuery({
    queryKey: aiLabKeys.experiments(),
    queryFn: () => aiService.getExperiments(),
  })
}

export function useAiExperiment(id) {
  return useQuery({
    queryKey: aiLabKeys.experiment(id),
    queryFn: () => aiService.getExperiment(id),
    enabled: Boolean(id),
  })
}

export function useCreateExperiment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => aiService.createExperiment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiLabKeys.experiments() })
      notify.success(i18n.t('aiLab:experimentCreatedSuccess', 'Experiment created successfully'))
    },
    onError: (err) => {
      notify.error(err.message || i18n.t('aiLab:createExperimentError', 'Failed to create experiment'))
    },
  })
}

export function useRunExperimentCase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ experimentId, imageBlob, groundTruth }) =>
      aiService.runExperimentCase(experimentId, imageBlob, groundTruth),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: aiLabKeys.experiment(vars.experimentId) })
      queryClient.invalidateQueries({ queryKey: aiLabKeys.experiments() })
      notify.success(i18n.t('aiLab:caseEvaluatedSuccess', 'Test case evaluated and saved'))
    },
    onError: (err) => {
      notify.error(err.message || i18n.t('aiLab:evaluateCaseError', 'Failed to evaluate test case'))
    },
  })
}

export function useResetExperiment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (experimentId) => aiService.resetExperiment(experimentId),
    onSuccess: (_, experimentId) => {
      queryClient.invalidateQueries({ queryKey: aiLabKeys.experiment(experimentId) })
      queryClient.invalidateQueries({ queryKey: aiLabKeys.experiments() })
      notify.success(i18n.t('aiLab:experimentResetSuccess', 'Experiment test cases cleared'))
    },
    onError: (err) => {
      notify.error(err.message || i18n.t('aiLab:experimentResetError', 'Failed to clear test cases'))
    },
  })
}

export function useExportExperimentCsv() {
  return useMutation({
    mutationFn: async (experimentId) => {
      const csv = await aiService.exportExperimentCsv(experimentId)
      downloadCsvText(csv, `tindatrack-experiment-${experimentId}.csv`)
      return csv
    },
    onSuccess: () => {
      notify.success(i18n.t('aiLab:exportCasesSuccess', 'Experiment cases CSV downloaded'))
    },
    onError: (err) => {
      notify.error(err.message || i18n.t('aiLab:exportCasesError', 'Failed to export experiment cases'))
    },
  })
}
