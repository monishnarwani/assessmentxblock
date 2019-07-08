from opaque_keys.edx.keys import CourseKey, UsageKey
import re
def get_header(total_problems):

    header=[]
    for i in range(total_problems):
        header.append("Problem " + str(i + 1) + " score")
        header.append("Problem " + str(i + 1) + " response")
    return header

def create_scores(score_report):
    row=[]
    for sc in score_report:
        curr_score = sc["is_correct"]
        if curr_score == -1:
            row.append("Not attempted")
            row.append("NA")
        else:
            if curr_score == 1:
                row.append("correct")
            else:
                row.append("incorrect")
            if type(sc["ans_submitted"][0]) == type([]):
                for op in range(len(sc["ans_submitted"][0])):
                    try:
                        sc["ans_submitted"][0][op] = str(int(sc["ans_submitted"][0][op].split("_")[-1]) + 1)
                    except:
                        pass
                row.append(",".join(sc["ans_submitted"][0]))
            else:
                row_val = sc["ans_submitted"][0]
                pattern = re.compile("choice_[0-9]+")
                if pattern.match(row_val):
                    row_val = str(int(row_val.split("_")[-1]) + 1)
                row.append(row_val)
    return row

    
def prepare_report(markslist ,ab_type,total_ques,course_id):
        
    if ab_type == "cme_test":
        init_header = ["Unique Identifier", "attempt_no"]
     
    header=init_header+ get_header(total_ques)
    csvData = [header]
    for marks in markslist:
        row=[]
        print marks
        old_rows=[]
        row.append(marks[0])
        if marks[1].has_key('score_report'):
            if marks[1].has_key('attempt_no'):
                row.append(marks[1]["attempt_no"])
                if marks[1].has_key("attempt_score_history"):
                    score_data = marks[1]["attempt_score_history"]
                    score_data.reverse()
                    ctr=1
                    for score in score_data:
                        old_rows=old_rows+[[marks[0],ctr] + create_scores(score)]
                        
                        ctr =ctr+1
            else:
                row.append(1)
            row=row+create_scores(marks[1]['score_report'])
        else:
            # Ignore the row if no problem is attempted
            continue    
        csvData= csvData+[row]+old_rows
    return  {
            "results": csvData,
            "course": course_id
        }