#!/bin/bash

# ============================================
# LIMPEZA DE SKILLS DUPLICADAS MCP
# ============================================
# Este script remove skills duplicadas mantendo apenas uma cópia
# Data: 2026-01-23
# ============================================

echo "============================================"
echo "LIMPEZA DE SKILLS DUPLICADAS MCP"
echo "============================================"

# Diretórios a manter (prioridade):
# 1. .cursor/skills/ - Para Cursor (mais usado)
# 2. .agent/skills/ - Para outros agentes

echo "Removendo skills duplicadas do Vercel React Best Practices..."

# Remover duplicatas do .agent/skills/vercel-react-best-practices/
if [ -d ".agent/skills/vercel-react-best-practices" ]; then
    echo "Removendo .agent/skills/vercel-react-best-practices/"
    rm -rf .agent/skills/vercel-react-best-practices
fi

# Remover duplicatas do .claude/skills/vercel-react-best-practices/
if [ -d ".claude/skills/vercel-react-best-practices" ]; then
    echo "Removendo .claude/skills/vercel-react-best-practices/"
    rm -rf .claude/skills/vercel-react-best-practices
fi

# Remover duplicatas do .gemini/skills/vercel-react-best-practices/
if [ -d ".gemini/skills/vercel-react-best-practices" ]; then
    echo "Removendo .gemini/skills/vercel-react-best-practices/"
    rm -rf .gemini/skills/vercel-react-best-practices
fi

# Remover duplicatas do .github/skills/vercel-react-best-practices/
if [ -d ".github/skills/vercel-react-best-practices" ]; then
    echo "Removendo .github/skills/vercel-react-best-practices/"
    rm -rf .github/skills/vercel-react-best-practices
fi

echo "Removendo skills duplicadas do Supabase Postgres Best Practices..."

# Manter apenas .cursor/skills/supabase-postgres-best-practices/
# Remover as outras duplicatas

# Remover duplicatas do .agent/skills/supabase-postgres-best-practices/
if [ -d ".agent/skills/supabase-postgres-best-practices" ]; then
    echo "Removendo .agent/skills/supabase-postgres-best-practices/"
    rm -rf .agent/skills/supabase-postgres-best-practices
fi

# Remover duplicatas do .agents/skills/supabase-postgres-best-practices/
if [ -d ".agents/skills/supabase-postgres-best-practices" ]; then
    echo "Removendo .agents/skills/supabase-postgres-best-practices/"
    rm -rf .agents/skills/supabase-postgres-best-practices
fi

# Remover duplicatas do .claude/skills/supabase-postgres-best-practices/
if [ -d ".claude/skills/supabase-postgres-best-practices" ]; then
    echo "Removendo .claude/skills/supabase-postgres-best-practices/"
    rm -rf .claude/skills/supabase-postgres-best-practices
fi

# Remover duplicatas do .gemini/skills/supabase-postgres-best-practices/
if [ -d ".gemini/skills/supabase-postgres-best-practices" ]; then
    echo "Removendo .gemini/skills/supabase-postgres-best-practices/"
    rm -rf .gemini/skills/supabase-postgres-best-practices
fi

# Remover duplicatas do .github/skills/supabase-postgres-best-practices/
if [ -d ".github/skills/supabase-postgres-best-practices" ]; then
    echo "Removendo .github/skills/supabase-postgres-best-practices/"
    rm -rf .github/skills/supabase-postgres-best-practices
fi

echo "============================================"
echo "VERIFICAÇÃO FINAL"
echo "============================================"

echo "Skills restantes:"
find . -name "skills" -type d | head -10

echo ""
echo "Contagem de skills por diretório:"
echo "Cursor skills:"
ls -la .cursor/skills/ 2>/dev/null | wc -l

echo ""
echo "✅ LIMPEZA CONCLUÍDA!"
echo "============================================"