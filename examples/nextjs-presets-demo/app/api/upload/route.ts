import { NextRequest, NextResponse } from 'next/server';
import { scan, ReasonCode, getReasonCodeInfo } from 'pompelmi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Parse preset from query param or use default
function getPreset(searchParams: URLSearchParams) {
  const preset = searchParams.get('preset');
  if (preset === 'strict' || preset === 'balanced' || preset === 'fast') {
    return preset;
  }
  return 'balanced'; // default
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Get preset from query param: /api/upload?preset=strict
    const preset = getPreset(req.nextUrl.searchParams);

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Scan with chosen preset
    const result = await scan(buffer, { preset });

    // Extract reason codes for analysis
    const reasonCodes = result.findingsWithReasons?.map(f => ({
      code: f.reasonCode,
      message: f.message,
      metadata: f.metadata,
      info: getReasonCodeInfo(f.reasonCode)
    })) || [];

    // Automated decision logic
    const hasMalware = reasonCodes.some(r => 
      r.code.startsWith('MALWARE_') && r.code !== 'MALWARE_EICAR_TEST'
    );

    const hasEicar = reasonCodes.some(r => 
      r.code === 'MALWARE_EICAR_TEST'
    );

    const needsReview = reasonCodes.some(r => 
      ['FILE_POLYGLOT', 'FILE_EMBEDDED_SCRIPT', 'ARCHIVE_TOO_DEEP'].includes(r.code)
    );

    // Determine action
    let action = 'allow';
    let statusCode = 200;
    let message = 'File uploaded successfully';

    if (hasMalware && !hasEicar) {
      action = 'reject';
      statusCode = 422;
      message = 'Malware detected - upload rejected';
    } else if (hasEicar) {
      action = 'test_detected';
      statusCode = 422;
      message = 'EICAR test file detected (safe test pattern)';
    } else if (needsReview) {
      action = 'quarantine';
      statusCode = 202;
      message = 'File quarantined for manual review';
    }

    return NextResponse.json({
      success: action === 'allow',
      fileName: file.name,
      fileSize: file.size,
      preset,
      verdict: result.verdict,
      action,
      message,
      findings: reasonCodes,
      stats: {
        durationMs: result.durationMs,
        bytes: result.bytes,
        findingCount: reasonCodes.length
      }
    }, { status: statusCode });

  } catch (error: any) {
    console.error('Upload scan error:', error);
    return NextResponse.json(
      { 
        error: 'Scan failed',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// GET endpoint for API info
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/upload',
    method: 'POST',
    description: 'Upload and scan files with pompelmi policy presets',
    parameters: {
      file: 'File to upload (multipart/form-data)',
      preset: 'Policy preset: strict | balanced | fast (query param, default: balanced)'
    },
    presets: {
      strict: {
        maxDepth: 2,
        maxBufferSize: '5MB',
        heuristicThreshold: 60,
        failFast: true,
        useCase: 'High-security, untrusted uploads'
      },
      balanced: {
        maxDepth: 4,
        maxBufferSize: '10MB',
        heuristicThreshold: 75,
        failFast: false,
        useCase: 'General production (recommended)'
      },
      fast: {
        maxDepth: 1,
        maxBufferSize: '20MB',
        heuristicThreshold: 85,
        failFast: true,
        useCase: 'Performance-critical, trusted sources'
      }
    },
    usage: {
      curl_balanced: 'curl -F "file=@test.txt" http://localhost:3200/api/upload',
      curl_strict: 'curl -F "file=@test.txt" "http://localhost:3200/api/upload?preset=strict"',
      curl_eicar: 'curl -F "file=@eicar.txt" http://localhost:3200/api/upload'
    }
  });
}
