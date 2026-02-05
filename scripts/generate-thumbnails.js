/**
 * Script para gerar thumbnails otimizados dos avatares
 * 
 * Uso: node scripts/generate-thumbnails.js
 * Requer: npm install sharp --save-dev
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, '..', 'public', 'avatars', 'ze-gotinha');

const thumbDir = path.join(sourceDir, 'thumb');

async function generateThumbnails() {
    console.log('🖼️  Gerando thumbnails otimizados...\n');

    // Criar diretório de thumbnails se não existir
    if (!fs.existsSync(thumbDir)) {
        fs.mkdirSync(thumbDir, { recursive: true });
        console.log(`📁 Criado diretório: ${thumbDir}\n`);
    }

    const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.png') && f.startsWith('zg'));

    let totalOriginal = 0;
    let totalOptimized = 0;

    for (const file of files) {
        const inputPath = path.join(sourceDir, file);
        const outputName = file.replace('.png', '.webp');
        const outputPath = path.join(thumbDir, outputName);

        try {
            const originalStats = fs.statSync(inputPath);
            totalOriginal += originalStats.size;

            await sharp(inputPath)
                .resize(64, 64, {
                    fit: 'cover',
                    position: 'center'
                })
                .webp({
                    quality: 85,
                    effort: 6 // melhor compressão
                })
                .toFile(outputPath);

            const optimizedStats = fs.statSync(outputPath);
            totalOptimized += optimizedStats.size;

            const savings = ((1 - optimizedStats.size / originalStats.size) * 100).toFixed(1);
            console.log(`✅ ${file} → ${outputName}`);
            console.log(`   Original: ${(originalStats.size / 1024).toFixed(0)} KB → Otimizado: ${(optimizedStats.size / 1024).toFixed(1)} KB (${savings}% menor)\n`);

        } catch (err) {
            console.error(`❌ Erro processando ${file}:`, err.message);
        }
    }

    console.log('━'.repeat(50));
    console.log(`📊 RESUMO:`);
    console.log(`   Arquivos processados: ${files.length}`);
    console.log(`   Tamanho original total: ${(totalOriginal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Tamanho otimizado total: ${(totalOptimized / 1024).toFixed(1)} KB`);
    console.log(`   Economia total: ${((1 - totalOptimized / totalOriginal) * 100).toFixed(1)}%`);
    console.log('\n🎉 Thumbnails gerados com sucesso!');
}

generateThumbnails().catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
});
