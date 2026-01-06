#!/bin/bash

# pompelmi SEO Performance Monitor
# Automated script to track and report SEO metrics

set -euo pipefail

# Configuration
REPO_URL="https://github.com/pompelmi/pompelmi"
WEBSITE_URL="https://pompelmi.github.io"
ANALYTICS_FILE="seo-metrics.json"
DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 pompelmi SEO Performance Monitor${NC}"
echo "================================================"
echo "Date: $(date)"
echo "Repository: $REPO_URL"
echo "Website: $WEBSITE_URL"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to make HTTP request and measure response time
check_website_performance() {
    echo -e "${BLUE}📊 Website Performance${NC}"
    echo "------------------------"
    
    if command_exists curl; then
        # Measure response time
        response_time=$(curl -o /dev/null -s -w "%{time_total}" "$WEBSITE_URL")
        response_code=$(curl -o /dev/null -s -w "%{http_code}" "$WEBSITE_URL")
        
        echo "Response code: $response_code"
        echo "Response time: ${response_time}s"
        
        if (( $(echo "$response_time > 2.0" | bc -l) )); then
            echo -e "${YELLOW}⚠️  Warning: Response time > 2 seconds${NC}"
        else
            echo -e "${GREEN}✅ Good response time${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  curl not available, skipping performance check${NC}"
    fi
    echo ""
}

# Function to check meta tags and SEO elements
check_seo_elements() {
    echo -e "${BLUE}🏷️  SEO Elements Check${NC}"
    echo "------------------------"
    
    if command_exists curl; then
        html_content=$(curl -s "$WEBSITE_URL")
        
        # Check for essential SEO elements
        if echo "$html_content" | grep -q "<title>"; then
            title=$(echo "$html_content" | grep -o '<title>[^<]*</title>' | sed 's/<[^>]*>//g' || echo "Not found")
            echo "✅ Title tag: $title"
        else
            echo -e "${RED}❌ Title tag missing${NC}"
        fi
        
        if echo "$html_content" | grep -q 'name="description"'; then
            echo "✅ Meta description found"
        else
            echo -e "${RED}❌ Meta description missing${NC}"
        fi
        
        if echo "$html_content" | grep -q 'property="og:'; then
            echo "✅ Open Graph tags found"
        else
            echo -e "${YELLOW}⚠️  Open Graph tags missing${NC}"
        fi
        
        if echo "$html_content" | grep -q 'name="twitter:'; then
            echo "✅ Twitter Card tags found"
        else
            echo -e "${YELLOW}⚠️  Twitter Card tags missing${NC}"
        fi
        
        if echo "$html_content" | grep -q '"@type".*"SoftwareApplication"'; then
            echo "✅ Schema.org structured data found"
        else
            echo -e "${YELLOW}⚠️  Schema.org markup missing${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  curl not available, skipping SEO elements check${NC}"
    fi
    echo ""
}

# Function to check GitHub repository metrics
check_github_metrics() {
    echo -e "${BLUE}⭐ GitHub Repository Metrics${NC}"
    echo "------------------------------"
    
    if command_exists curl && command_exists jq; then
        api_url="https://api.github.com/repos/pompelmi/pompelmi"
        repo_data=$(curl -s "$api_url")
        
        stars=$(echo "$repo_data" | jq -r '.stargazers_count // "N/A"')
        forks=$(echo "$repo_data" | jq -r '.forks_count // "N/A"')
        watchers=$(echo "$repo_data" | jq -r '.watchers_count // "N/A"')
        issues=$(echo "$repo_data" | jq -r '.open_issues_count // "N/A"')
        
        echo "⭐ Stars: $stars"
        echo "🍴 Forks: $forks"
        echo "👀 Watchers: $watchers"
        echo "🐛 Open issues: $issues"
        
        # Check if repository has important files
        files_to_check=("README.md" "CONTRIBUTING.md" "LICENSE" "SECURITY.md")
        for file in "${files_to_check[@]}"; do
            file_url="https://api.github.com/repos/pompelmi/pompelmi/contents/$file"
            if curl -s "$file_url" | jq -e '.name' >/dev/null 2>&1; then
                echo "✅ $file exists"
            else
                echo -e "${YELLOW}⚠️  $file missing${NC}"
            fi
        done
    else
        echo -e "${YELLOW}⚠️  curl or jq not available, skipping GitHub metrics${NC}"
    fi
    echo ""
}

# Function to check npm package metrics
check_npm_metrics() {
    echo -e "${BLUE}📦 NPM Package Metrics${NC}"
    echo "------------------------"
    
    if command_exists curl && command_exists jq; then
        npm_api="https://api.npmjs.org/downloads/range/last-month/pompelmi"
        downloads=$(curl -s "$npm_api" | jq -r '.downloads | length // "N/A"')
        
        echo "📈 Downloads (last month): $downloads"
        
        # Check package.json for SEO-relevant fields
        package_url="https://registry.npmjs.org/pompelmi"
        package_data=$(curl -s "$package_url")
        
        keywords=$(echo "$package_data" | jq -r '.keywords // [] | join(", ")')
        description=$(echo "$package_data" | jq -r '.description // "N/A"')
        
        echo "📝 Description: $description"
        echo "🏷️  Keywords: $keywords"
    else
        echo -e "${YELLOW}⚠️  curl or jq not available, skipping npm metrics${NC}"
    fi
    echo ""
}

# Function to generate SEO report
generate_report() {
    echo -e "${BLUE}📋 SEO Recommendations${NC}"
    echo "-------------------------"
    
    echo "🎯 Quick Wins:"
    echo "  • Ensure all pages have unique title tags"
    echo "  • Add meta descriptions (150-160 chars)"
    echo "  • Optimize images with alt tags"
    echo "  • Internal linking between docs pages"
    
    echo ""
    echo "📈 Growth Opportunities:"
    echo "  • Create tutorial content for long-tail keywords"
    echo "  • Guest posting on security blogs"
    echo "  • Engage in Stack Overflow discussions"
    echo "  • Regular blog posts about security trends"
    
    echo ""
    echo "🔧 Technical SEO:"
    echo "  • Monitor Core Web Vitals"
    echo "  • Implement proper canonical URLs"
    echo "  • Add XML sitemap"
    echo "  • Optimize for mobile devices"
    
    echo ""
    echo "🤝 Community Building:"
    echo "  • Regular GitHub Discussions engagement"
    echo "  • Conference presentations"
    echo "  • Open source contributions recognition"
    echo "  • Security community partnerships"
}

# Function to save metrics to JSON
save_metrics() {
    echo -e "${BLUE}💾 Saving Metrics${NC}"
    echo "------------------"
    
    cat > "$ANALYTICS_FILE" << EOF
{
  "timestamp": "$DATE",
  "website": {
    "url": "$WEBSITE_URL",
    "last_checked": "$DATE"
  },
  "github": {
    "url": "$REPO_URL",
    "last_checked": "$DATE"
  },
  "seo_check": {
    "completed": true,
    "next_check": "$(date -u -d '+1 week' +"%Y-%m-%dT%H:%M:%SZ")"
  }
}
EOF
    
    echo "✅ Metrics saved to $ANALYTICS_FILE"
}

# Main execution
main() {
    check_website_performance
    check_seo_elements
    check_github_metrics
    check_npm_metrics
    generate_report
    save_metrics
    
    echo ""
    echo -e "${GREEN}🎉 SEO monitoring complete!${NC}"
    echo "Run this script weekly to track improvements."
    echo ""
    echo "Next steps:"
    echo "1. Review recommendations above"
    echo "2. Implement quick wins first"
    echo "3. Set up automated monitoring"
    echo "4. Track keyword rankings monthly"
}

# Run the main function
main "$@"