package NLG;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.text.ParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.concurrent.ThreadLocalRandom;

import org.json.simple.*;
import org.json.simple.parser.JSONParser;


public class generateExpression {

	public static double threshold = 0.5;
	public static String separator ="_";
	public static String PATH = "/Users/shmueli/emotion/JP-2016/Expression/PI/";
	public static HashMap<String,ArrayList<String>> expressionMap = new HashMap<String, ArrayList<String>>();


	public static String checkExtension(String fileName){
		String extension = "";

		int i = fileName.lastIndexOf('.');
		if (i > 0) {
			extension = fileName.substring(i+1);
			if (extension.equals("txt")){
				return fileName.substring(0, i);
			}
			else{
				return null;
			}
		}
		return null;
	}

	public static HashMap<String,ArrayList<String>> loadExpressions(String path) throws IOException {
		File root = new File(path);
		File[] list = root.listFiles();

		if (list == null) return null;

		for ( File f : list ) {
			if ( f.isDirectory() ) {
				loadExpressions( f.getAbsolutePath() );
				System.out.println( "Dir:" + f.getAbsoluteFile() );
			}
			else {
				String key ="";
				if((key =checkExtension(f.getName())) != null){
					System.out.println( "File:" + f.getAbsoluteFile() );
					FileReader inputFileReader   = new FileReader(f.getAbsoluteFile());
					BufferedReader inputStream   = new BufferedReader(inputFileReader);
					String inLine = null;
					//read all expressions in array
					ArrayList<String> al = new ArrayList<String>();
					while ((inLine = inputStream.readLine()) != null) {
						al.add(inLine);

					}
					expressionMap.put(key, al);
				}

			}
		}

		return expressionMap;

	}

		public static HashMap<String,Object> convertJsonToMap (String payload) throws ParseException, org.json.simple.parser.ParseException{	

	        JSONParser parser = new JSONParser();
	        JSONObject obj = (JSONObject)parser.parse(payload);
	        System.out.println(obj.toString());

	        HashMap<String,Object> toneExpressionPayload = new HashMap<String,Object>();
	        toneExpressionPayload.put("customer_emotion", obj.get("customer_emotion").toString());
	        toneExpressionPayload.put("customer_intent", obj.get("customer_intent").toString());
	        toneExpressionPayload.put("agent_tone", obj.get("agent_tone").toString());
	        toneExpressionPayload.put("agent_intensity", obj.get("agent_intensity").toString());
	     
	        JSONArray agentToneHistoryObj = (JSONArray) obj.get("agent_tone_history");
	        ArrayList<String> agentTones = new ArrayList<String>();
	        int len = agentToneHistoryObj.toArray().length;        
	        for(int i=0; i < len; i++){
	        	String tone = (String) agentToneHistoryObj.get(i);
	        	agentTones.add(tone);
	        }
	        toneExpressionPayload.put("agent_tone_history", agentTones);   
	        
	        JSONArray customerToneHistoryObj = (JSONArray) obj.get("customer_emotion_history");
	        ArrayList<String> customerTones = new ArrayList<String>();
	        int clen = customerToneHistoryObj.toArray().length;        
	        for(int i=0; i < clen; i++){
	        	String tone = (String) customerToneHistoryObj.get(i);
	        	customerTones.add(tone);
	        }
	        toneExpressionPayload.put("customer_emotion_history", customerTones);       
	        
	        
		return toneExpressionPayload;
	}
	
	public static boolean checkHistory(ArrayList<String> emotions, ArrayList<String> tones,String current_emotion, String current_tone){
		
		
		// check if we already detected this emotion previously
		if(emotions.contains(current_emotion)){
			// check if the tone was previously used with along with the emotion
			int index = emotions.indexOf(current_emotion);
			if(tones.get(index).equals(current_tone)){
				return true;
			}
		}
		
		return false;
	}

	public static String getExpression(String input) throws IOException, ParseException, org.json.simple.parser.ParseException {


		String tone = "";
		String emotion = "";
		String intensity = "";
		String intent = "";
		ArrayList<String> tone_history = new ArrayList<String>();
		ArrayList<String> emotion_history = new ArrayList<String>();
		String key="";
		String output="";

		HashMap<String, Object> payload = convertJsonToMap(input);

		// build the key to the map
		tone = (String) payload.get("agent_tone");
		emotion = (String)payload.get("customer_emotion");
		intent = (String)payload.get("customer_intent");
		intensity= (String)payload.get("agent_intensity");
		tone_history = (ArrayList<String>) payload.get("agent_tone_history");
		emotion_history = (ArrayList<String>)payload.get("customer_emotion_history");

		// if neutral, no need to add expression
		if(!tone.equals("neutral")){

			
			// set the intensity to high or medium
			if (Double.valueOf(intensity) > threshold){
				intensity = "high"; 
			}
			else {
				intensity = "med"; 
			}
			
			// if customer emotion neutral,  don't acknowledge any emotion, just simple tone
			if (emotion.equals("neutral")){
				key = tone+separator+intensity;
			}
			else{
				// check history- we don't want the agent to acknowledge more than once the same emotion in the conversation
				if(!checkHistory(emotion_history,tone_history,emotion,tone)){
					key = tone+separator+emotion;
				}
				else{
					key = tone+separator+intensity;
				}
			
			}
			ArrayList<String> expression = expressionMap.get(key); 	

			// pick random sentence based on the input
			int randomNum =ThreadLocalRandom.current().nextInt(0, expression.size()-1 + 1);
			output = expression.get(randomNum);

		}
		return output;
	}
	
	public static void main(String[] args) throws IOException {

		String input = "{\"customer_emotion\": \"fear\", \"customer_intent\": " +
				"\"directions\", \"agent_tone\": \"empathy\",\"agent_intensity\": \"0.723\", " + 
				"\"customer_emotion_history\": [\"neutral\",\"anger\",\"sadness\"], " +
				"\"agent_tone_history\": [\"neutral\",\"apology\",\"empathy\"]}";
		
		try {
			// load data
			expressionMap = loadExpressions(PATH);

			String output = getExpression(input);
			System.out.println(output);
		} catch (ParseException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} catch (org.json.simple.parser.ParseException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}

	}
}