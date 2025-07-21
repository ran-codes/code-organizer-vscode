import * as assert from 'assert';
import { findSections } from '../utils/findSections';

suite('Hash Comment Tests (#)', () => {

	test('Should find basic hash sections', () => {
		const text = `
# Section One ----
Some content here
## Subsection ----
More content
# Section Two ----
Final content
`;
		const sections = findSections(text);
		assert.strictEqual(sections.length, 3);

		// Test basic properties
		assert.strictEqual(sections[0].name, 'Section One');
		assert.strictEqual(sections[0].depth, 1);
		assert.strictEqual(sections[1].name, 'Subsection');
		assert.strictEqual(sections[1].depth, 2);
		assert.strictEqual(sections[2].name, 'Section Two');
		assert.strictEqual(sections[2].depth, 1);
	});

	test('Should handle hash comment nesting (##, ###, ####)', () => {
		const text = `
# Level 1 ----
## Level 2 ----
### Level 3 ----
#### Level 4 ----
##### Level 5 (should be capped at 4) ----
`;
		const sections = findSections(text);
		assert.strictEqual(sections.length, 5);

		assert.strictEqual(sections[0].depth, 1);
		assert.strictEqual(sections[1].depth, 2);
		assert.strictEqual(sections[2].depth, 3);
		assert.strictEqual(sections[3].depth, 4);
		assert.strictEqual(sections[4].depth, 4); // Capped at 4
	});

	test('Should create unique IDs for hash sections', () => {
		const text = `
# Test Section ----
## Sub Section ----
`;
		const sections = findSections(text);

		assert.strictEqual(sections.length, 2);
		assert.ok(sections[0].uniqueId.includes('Test Section'));
		assert.ok(sections[1].uniqueId.includes('Sub Section'));
		
		// Parent relationship should use unique ID
		assert.strictEqual(sections[1].parentName, sections[0].uniqueId);
	});

	test('Should handle duplicate hash section names', () => {
		const text = `
# Helper Functions ----
def helper1():
    pass

# Main Code ----
# Helper Functions ----
def helper2():
    pass
`;
		const sections = findSections(text);
		assert.strictEqual(sections.length, 3);

		// Both "Helper Functions" sections should exist
		const helperSections = sections.filter(s => s.name === 'Helper Functions');
		assert.strictEqual(helperSections.length, 2);

		// They should have different unique IDs
		assert.notStrictEqual(helperSections[0].uniqueId, helperSections[1].uniqueId);
	});

	test('Should ignore invalid hash patterns', () => {
		const text = `
# Too Short --
# Valid Section ----
#NoSpaceSection----
# ---- (no name)
#   ----
`;
		const sections = findSections(text);

		// Should only find the one valid section
		assert.strictEqual(sections.length, 1);
		assert.strictEqual(sections[0].name, 'Valid Section');
	});

	test('Should handle Python-style hash comments', () => {
		const text = `
# 1. Configuration ----
DATABASE_URL = "localhost"
API_KEY = "secret"

## 1.1 Database Settings ----
def connect_db():
    pass

## 1.2 API Settings ----
def call_api():
    pass

# 2. Utils ----
def helper():
    pass
`;
		const sections = findSections(text);
		assert.strictEqual(sections.length, 4);

		const config = sections.find(s => s.name === '1. Configuration')!;
		const dbSettings = sections.find(s => s.name === '1.1 Database Settings')!;
		const apiSettings = sections.find(s => s.name === '1.2 API Settings')!;
		const utils = sections.find(s => s.name === '2. Utils')!;

		// Test parent relationships
		assert.strictEqual(config.parentName, undefined);
		assert.strictEqual(dbSettings.parentName, config.uniqueId);
		assert.strictEqual(apiSettings.parentName, config.uniqueId);
		assert.strictEqual(utils.parentName, undefined);
	});

	test('Should handle indented hash comments with spaces', () => {
		const text = `
# 1. Main Module ----
import sys

    ## 1.1 Helper Functions ----
    def helper():
        pass
    
        ### 1.1.1 Deep Helper ----
        def deep_helper():
            return True
    
    ## 1.2 Configuration ----
    CONFIG = {
        'debug': True
    }

# 2. Entry Point ----
if __name__ == '__main__':
    main()
`;
		const sections = findSections(text);
		assert.strictEqual(sections.length, 5);

		const mainModule = sections.find(s => s.name === '1. Main Module')!;
		const helpers = sections.find(s => s.name === '1.1 Helper Functions')!;
		const deepHelper = sections.find(s => s.name === '1.1.1 Deep Helper')!;
		const config = sections.find(s => s.name === '1.2 Configuration')!;
		const entryPoint = sections.find(s => s.name === '2. Entry Point')!;

		// Test depths
		assert.strictEqual(mainModule.depth, 1);
		assert.strictEqual(helpers.depth, 2);
		assert.strictEqual(deepHelper.depth, 3);
		assert.strictEqual(config.depth, 2);
		assert.strictEqual(entryPoint.depth, 1);

		// Test parent relationships
		assert.strictEqual(mainModule.parentName, undefined);
		assert.strictEqual(helpers.parentName, mainModule.uniqueId);
		assert.strictEqual(deepHelper.parentName, helpers.uniqueId);
		assert.strictEqual(config.parentName, mainModule.uniqueId);
		assert.strictEqual(entryPoint.parentName, undefined);
	});

	test('Should handle indented hash comments with tabs', () => {
		const text = `
# Data Analysis ----
import pandas as pd

	## Data Loading ----
	data = pd.read_csv('file.csv')
	
		### Data Cleaning ----
		data = data.dropna()
		
	## Plotting ----
	import matplotlib.pyplot as plt
`;
		const sections = findSections(text);
		assert.strictEqual(sections.length, 4);

		assert.strictEqual(sections[0].name, 'Data Analysis');
		assert.strictEqual(sections[0].depth, 1);
		assert.strictEqual(sections[1].name, 'Data Loading');
		assert.strictEqual(sections[1].depth, 2);
		assert.strictEqual(sections[2].name, 'Data Cleaning');
		assert.strictEqual(sections[2].depth, 3);
		assert.strictEqual(sections[3].name, 'Plotting');
		assert.strictEqual(sections[3].depth, 2);
	});

	test('Should handle R-style indented comments', () => {
		const text = `
# 1. Data Analysis ----
library(ggplot2)

    ## 1.1 Data Loading ----
    data <- read.csv("data.csv")
    
        ### 1.1.1 Data Validation ----
        summary(data)
    
    ## 1.2 Plotting ----
    plot <- ggplot(data, aes(x, y)) + geom_point()

# 2. Statistics ----
mean_value <- mean(data$value)
`;
		const sections = findSections(text);
		assert.strictEqual(sections.length, 5);

		const dataAnalysis = sections.find(s => s.name === '1. Data Analysis')!;
		const dataLoading = sections.find(s => s.name === '1.1 Data Loading')!;
		const validation = sections.find(s => s.name === '1.1.1 Data Validation')!;
		const plotting = sections.find(s => s.name === '1.2 Plotting')!;
		const stats = sections.find(s => s.name === '2. Statistics')!;

		// Verify indented comments work correctly
		assert.strictEqual(dataAnalysis.parentName, undefined);
		assert.strictEqual(dataLoading.parentName, dataAnalysis.uniqueId);
		assert.strictEqual(validation.parentName, dataLoading.uniqueId);
		assert.strictEqual(plotting.parentName, dataAnalysis.uniqueId);
		assert.strictEqual(stats.parentName, undefined);
	});
});
