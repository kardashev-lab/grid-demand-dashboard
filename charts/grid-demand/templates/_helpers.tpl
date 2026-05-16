{{/* common labels */}}
{{- define "grid-demand.labels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" }}
{{- end -}}

{{/* image ref helper, usage: {{ include "grid-demand.image" (dict "ctx" . "name" .Values.image.fetcher) }} */}}
{{- define "grid-demand.image" -}}
{{- $ctx := .ctx -}}
{{- printf "%s/%s:%s" $ctx.Values.image.registry .name $ctx.Values.image.tag -}}
{{- end -}}
